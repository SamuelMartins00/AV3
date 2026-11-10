import { createHash } from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { ErroDominio } from "../../dominio/erros.js";
import { env } from "../../config/env.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { TipoTarefa } from "../../generated/prisma/client.js";
import { enfileirarTarefa } from "./tarefas.queue.js";

export interface CriarTarefaInput {
  tipo: TipoTarefa;
  parametros: Record<string, unknown>;
  organizacaoId?: number;
  chaveApiId?: number;
  escopoIdempotencia: string;
  chaveIdempotencia?: string;
}

function chaveIdempotente(escopo: string, chave?: string): string | null {
  if (!chave) return null;
  return createHash("sha256").update(`${escopo}:${chave}`).digest("hex");
}

function conferirIdempotencia(existente: { tipo: string; organizacaoId: number | null; parametros: unknown }, input: CriarTarefaInput) {
  const mesmoPayload = existente.tipo === input.tipo &&
    existente.organizacaoId === (input.organizacaoId ?? null) &&
    JSON.stringify(existente.parametros ?? {}) === JSON.stringify(input.parametros);
  if (!mesmoPayload) {
    throw new ErroDominio("Idempotency-Key já utilizada com parâmetros diferentes", 409);
  }
}

export class TarefasProducer {
  async criar(input: CriarTarefaInput) {
    const idempotencia = chaveIdempotente(input.escopoIdempotencia, input.chaveIdempotencia);
    if (idempotencia) {
      const existente = await prisma.tarefaAssincrona.findUnique({
        where: { chaveIdempotencia: idempotencia },
      });
      if (existente) {
        conferirIdempotencia(existente, input);
        return existente;
      }
    }

    let tarefa;
    try {
      tarefa = await prisma.tarefaAssincrona.create({
        data: {
          tipo: input.tipo,
          parametros: input.parametros as Prisma.InputJsonValue,
          organizacaoId: input.organizacaoId,
          chaveApiId: input.chaveApiId,
          chaveIdempotencia: idempotencia,
          maxTentativas: env.taskMaxAttempts,
          status: "PENDENTE",
        },
      });
    } catch (erro) {
      // Duas requisições simultâneas com a mesma chave convergem para o mesmo registro.
      if (idempotencia && (erro as { code?: string }).code === "P2002") {
        const concorrente = await prisma.tarefaAssincrona.findUnique({
          where: { chaveIdempotencia: idempotencia },
        });
        if (concorrente) {
          conferirIdempotencia(concorrente, input);
          return concorrente;
        }
      }
      throw erro;
    }

    // O registro no MySQL é a fonte durável. Se Redis estiver indisponível,
    // permanece PENDENTE e o processo worker o recuperará na reconciliação.
    try {
      await enfileirarTarefa(tarefa.id);
    } catch (erro) {
      // Não converter em falha: a tarefa foi persistida e será reenfileirada.
      console.error(`Tarefa ${tarefa.id} persistida como PENDENTE; publicação Redis será recuperada pelo worker.`, erro);
    }
    return tarefa;
  }
}

export const tarefasProducer = new TarefasProducer();
