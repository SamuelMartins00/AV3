import { Worker, type Job } from "bullmq";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { redisConnection } from "../../infra/redis.js";
import { AnalisesService } from "../analises/analises.service.js";
import { RelatoriosService } from "../relatorios/relatorios.service.js";
import { NOME_FILA_TAREFAS, filaTarefas, enfileirarTarefa } from "./tarefas.queue.js";

type Payload = { tarefaId: string };
const analises = new AnalisesService();
const relatorios = new RelatoriosService();

async function executar(tarefaId: string): Promise<unknown> {
  const tarefa = await prisma.tarefaAssincrona.findUnique({ where: { id: tarefaId } });
  if (!tarefa) throw new Error(`Tarefa ${tarefaId} não encontrada`);
  if (tarefa.status === "CONCLUIDA" || tarefa.status === "CANCELADA") return tarefa.resultado;

  const p = (tarefa.parametros ?? {}) as unknown as Record<string, unknown>;
  const organizacaoId = tarefa.organizacaoId ?? (typeof p.organizacaoId === "number" ? p.organizacaoId : undefined);
  const consulta = {
    ...(organizacaoId ? { organizacaoId } : {}),
    ...(typeof p.inicio === "string" ? { inicio: p.inicio } : {}),
    ...(typeof p.fim === "string" ? { fim: p.fim } : {}),
    ...(typeof p.limiteAmostra === "number" ? { limiteAmostra: p.limiteAmostra } : {}),
  };

  switch (tarefa.tipo) {
    case "ANALISE_EFICIENCIA":
      return analises.eficiencia(consulta);
    case "ANALISE_RENTABILIDADE":
      return analises.rentabilidade(consulta);
    case "ANALISE_VIDA_UTIL":
      return analises.vidaUtil(consulta);
    case "ANALISE_COMPLETA": {
      const [eficiencia, rentabilidade, vidaUtil] = await Promise.all([
        analises.eficiencia(consulta),
        analises.rentabilidade(consulta),
        analises.vidaUtil(consulta),
      ]);
      return { eficiencia, rentabilidade, vidaUtil };
    }
    case "GERACAO_RELATORIO": {
      const tipo = p.relatorio;
      if (tipo === "FINANCEIRO") return relatorios.financeiro({ inicio: String(p.inicio), fim: String(p.fim) });
      if (tipo === "ORGANIZACAO") {
        if (!organizacaoId) throw new Error("organizacaoId é obrigatório para relatório de organização");
        return relatorios.porOrganizacao(organizacaoId, { inicio: String(p.inicio), fim: String(p.fim) });
      }
      if (tipo === "STATUS") return relatorios.porStatus({ status: String(p.status) as never });
      throw new Error("Tipo de relatório inválido");
    }
  }
}

async function processar(job: Job<Payload>) {
  const id = job.data.tarefaId;
  // Reivindicação condicional evita que um job atrasado inicie após cancelamento.
  // PROCESSANDO também é aceito para permitir recuperação de jobs stalled após crash.
  const reivindicada = await prisma.tarefaAssincrona.updateMany({
    where: { id, status: { in: ["PENDENTE", "PROCESSANDO"] } },
    data: {
      status: "PROCESSANDO",
      tentativas: job.attemptsMade + 1,
      iniciadaEm: new Date(),
      erro: null,
    },
  });
  if (!reivindicada.count) return;

  const tarefa = await prisma.tarefaAssincrona.findUnique({ where: { id } });
  if (!tarefa || tarefa.status !== "PROCESSANDO") return;
  const inicioExecucao = Date.now();

  // Heartbeat evita que a reconciliação re-enfileire uma tarefa legítima e demorada.
  const heartbeat = setInterval(() => {
    void prisma.tarefaAssincrona.updateMany({
      where: { id, status: "PROCESSANDO" },
      data: { atualizadoEm: new Date() },
    }).catch(() => undefined);
  }, 30_000);

  try {
    const resultado = await executar(id);
    const agora = new Date();
    const expira = new Date(agora.getTime() + env.taskResultTtlHours * 60 * 60 * 1000);
    await prisma.tarefaAssincrona.update({
      where: { id },
      data: {
        status: "CONCLUIDA",
        resultado: resultado as never,
        formatoArquivo: "application/json",
        resultadoExpiraEm: expira,
        erro: null,
        concluidaEm: agora,
        duracaoMs: Date.now() - inicioExecucao,
        atualizadoEm: agora,
      },
    });
    return { tarefaId: id, concluida: true };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha desconhecida no processamento";
    const terminal = job.attemptsMade + 1 >= (job.opts.attempts ?? env.taskMaxAttempts);
    await prisma.tarefaAssincrona.update({
      where: { id },
      data: {
        status: terminal ? "FALHOU" : "PENDENTE",
        tentativas: job.attemptsMade + 1,
        erro: mensagem.slice(0, 4000),
        duracaoMs: Date.now() - inicioExecucao,
        ...(terminal ? { concluidaEm: new Date() } : {}),
      },
    });
    throw erro;
  } finally {
    clearInterval(heartbeat);
  }
}

export const workerTarefas = new Worker<Payload>(
  NOME_FILA_TAREFAS,
  processar,
  { connection: redisConnection, concurrency: env.workerConcurrency, lockDuration: 120_000 },
);

export async function reconciliarTarefas(): Promise<void> {
  const limite = new Date(Date.now() - env.taskStaleMs);
  const [pendentes, abandonadas] = await Promise.all([
    prisma.tarefaAssincrona.findMany({
      where: { status: "PENDENTE" },
      select: { id: true },
      take: 500,
      orderBy: { criadoEm: "asc" },
    }),
    prisma.tarefaAssincrona.findMany({
      where: { status: "PROCESSANDO", atualizadoEm: { lt: limite } },
      select: { id: true },
      take: 500,
    }),
  ]);

  for (const tarefa of [...pendentes, ...abandonadas]) {
    const job = await filaTarefas.getJob(tarefa.id);
    const state = job ? await job.getState() : "missing";
    if (state === "active" || state === "waiting-children") continue;

    if (state === "waiting" || state === "delayed") {
      // O job já está aguardando no Redis; apenas corrige o espelho persistido.
      await prisma.tarefaAssincrona.updateMany({
        where: { id: tarefa.id, status: "PROCESSANDO" },
        data: { status: "PENDENTE", erro: null },
      });
      continue;
    }

    if (job && (state === "failed" || state === "completed")) {
      await job.remove().catch(() => undefined);
    }
    await prisma.tarefaAssincrona.updateMany({
      where: { id: tarefa.id, status: { in: ["PENDENTE", "PROCESSANDO"] } },
      data: { status: "PENDENTE", erro: null },
    });
    await enfileirarTarefa(tarefa.id);
  }

  // Resultados são JSON no MySQL, nunca em diretório público. Expiração apaga o payload.
  await prisma.tarefaAssincrona.updateMany({
    where: { status: "CONCLUIDA", resultadoExpiraEm: { lt: new Date() } },
    data: { resultado: Prisma.DbNull, arquivoUrl: null },
  });
}

workerTarefas.on("failed", (job, erro) => {
  // O estado detalhado já foi persistido no handler; este evento cobre falhas
  // inesperadas anteriores à entrada no handler.
  if (job) {
    void prisma.tarefaAssincrona.updateMany({
      where: { id: job.data.tarefaId, status: "PROCESSANDO", tentativas: { gte: env.taskMaxAttempts } },
      data: { status: "FALHOU", erro: erro.message.slice(0, 4000), concluidaEm: new Date() },
    });
  }
});

export async function iniciarReconciliação(): Promise<() => void> {
  await reconciliarTarefas().catch((erro) => console.error("Reconciliação inicial adiada:", erro));
  const timer = setInterval(() => {
    void reconciliarTarefas().catch(() => undefined);
  }, 30_000);
  return () => clearInterval(timer);
}
