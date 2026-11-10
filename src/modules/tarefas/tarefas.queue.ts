import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { redisConnection } from "../../infra/redis.js";

export const NOME_FILA_TAREFAS = `${env.redisPrefix}-tarefas`;

export const filaTarefas = new Queue(NOME_FILA_TAREFAS, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: env.taskMaxAttempts,
    backoff: { type: "exponential", delay: env.taskBackoffMs },
    removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 7 * 24 * 60 * 60, count: 5000 },
  },
});

export async function enfileirarTarefa(id: string): Promise<void> {
  await filaTarefas.add("processar-tarefa", { tarefaId: id }, { jobId: id });
}
