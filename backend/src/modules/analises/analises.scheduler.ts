import { Queue, Worker, type Job } from "bullmq";
import { env } from "../../config/env.js";
import { redisConnection } from "../../infra/redis.js";
import { tarefasProducer } from "../tarefas/tarefas.producer.js";

export const NOME_FILA_AGENDAMENTO_ANALISES = `${env.redisPrefix}-agendamento-analises`;
export const ID_AGENDADOR_ANALISES = "greencode-analises-completas-diarias";

type PayloadAgendamento = { scheduleId: string };
type ConfiguracaoAgenda = {
  enabled: boolean;
  cron: string;
  timezone: string;
};

export const filaAgendamentoAnalises = new Queue(NOME_FILA_AGENDAMENTO_ANALISES, {
  connection: redisConnection,
});

export async function registrarAgendaAnalises(
  fila: Pick<Queue, "upsertJobScheduler"> = filaAgendamentoAnalises,
  configuracao: ConfiguracaoAgenda = {
    enabled: env.analyticsScheduleEnabled,
    cron: env.analyticsScheduleCron,
    timezone: env.analyticsScheduleTimezone,
  },
): Promise<boolean> {
  if (!configuracao.enabled) return false;

  await fila.upsertJobScheduler(
    ID_AGENDADOR_ANALISES,
    { pattern: configuracao.cron, tz: configuracao.timezone },
    {
      name: "executar-analises-agendadas",
      data: { scheduleId: ID_AGENDADOR_ANALISES } satisfies PayloadAgendamento,
      opts: {
        attempts: env.taskMaxAttempts,
        backoff: { type: "exponential", delay: env.taskBackoffMs },
        removeOnComplete: { age: 7 * 24 * 60 * 60, count: 1000 },
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 1000 },
      },
    },
  );
  return true;
}

/**
 * Despacha uma ocorrência para a fila durável de tarefas.
 * O job.id do BullMQ identifica deterministicamente cada ocorrência recorrente,
 * permitindo que instâncias concorrentes convirjam pela idempotência do producer.
 */
export async function executarOcorrenciaAgendada(
  job: Pick<Job<PayloadAgendamento>, "id" | "data">,
  criarTarefa: typeof tarefasProducer.criar = tarefasProducer.criar.bind(tarefasProducer),
) {
  const inicio = Date.now();
  const ocorridoEm = new Date().toISOString();
  console.info(JSON.stringify({
    evento: "analise_agendada_inicio",
    scheduleId: job.data.scheduleId,
    jobId: job.id,
    iniciadoEm: ocorridoEm,
  }));

  try {
    if (!job.id) throw new Error("BullMQ não forneceu um identificador para a ocorrência agendada");
    const tarefa = await criarTarefa({
      tipo: "ANALISE_COMPLETA",
      parametros: {
        origem: "AGENDAMENTO",
        scheduleId: job.data.scheduleId,
        jobId: job.id,
        solicitadoEm: ocorridoEm,
      },
      escopoIdempotencia: `agenda:${job.data.scheduleId}`,
      chaveIdempotencia: job.id,
    });
    const duracaoMs = Date.now() - inicio;
    const resultado = { tarefaId: tarefa.id, status: tarefa.status };
    console.info(JSON.stringify({
      evento: "analise_agendada_fim",
      scheduleId: job.data.scheduleId,
      jobId: job.id,
      tarefaId: tarefa.id,
      resultado,
      duracaoMs,
      concluidoEm: new Date().toISOString(),
    }));
    return resultado;
  } catch (erro) {
    console.error(JSON.stringify({
      evento: "analise_agendada_falha",
      scheduleId: job.data.scheduleId,
      jobId: job.id,
      falha: erro instanceof Error ? erro.message : String(erro),
      duracaoMs: Date.now() - inicio,
      concluidoEm: new Date().toISOString(),
    }));
    throw erro;
  }
}

/**
 * Deve ser iniciado apenas no processo worker, nunca no servidor HTTP.
 * upsertJobScheduler usa um ID estável no Redis: várias instâncias podem
 * inicializar sem registrar agendas recorrentes duplicadas.
 */
export async function iniciarAgendamentoAnalises(): Promise<() => Promise<void>> {
  const registrada = await registrarAgendaAnalises();
  if (!registrada) {
    console.info("Agendamento de análises desabilitado neste ambiente.");
    return async () => undefined;
  }

  const worker = new Worker<PayloadAgendamento>(
    NOME_FILA_AGENDAMENTO_ANALISES,
    // O Worker do BullMQ passa (job, token). A função de domínio aceita
    // uma dependência opcional como segundo argumento; o wrapper impede
    // que o token seja confundido com a função criarTarefa.
    (job) => executarOcorrenciaAgendada(job),
    { connection: redisConnection, concurrency: 1 },
  );
  worker.on("failed", (job, erro) => {
    console.error("Falha no job recorrente de análises:", job?.id, erro);
  });
  worker.on("error", (erro) => console.error("Erro no worker de agendamento:", erro));
  await worker.waitUntilReady();

  console.info(JSON.stringify({
    evento: "agenda_analises_registrada",
    scheduleId: ID_AGENDADOR_ANALISES,
    cron: env.analyticsScheduleCron,
    timezone: env.analyticsScheduleTimezone,
  }));

  return async () => {
    await worker.close();
    await filaAgendamentoAnalises.close();
  };
}
