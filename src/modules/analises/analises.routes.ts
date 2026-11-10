import type { FastifyInstance } from "fastify";
import type { ParamsId } from "../compartilhado/params.js";
import { AnalisesController } from "./analises.controller.js";
import {
  atualizarAnaliseSchema,
  consultarAnalisesSchema,
  executarAnaliseSchema,
  excluirAnaliseSchema,
  resultadoAnaliseSchema,
  type AtualizarAnaliseBody,
  type ExecutarAnaliseBody,
  type ConsultarAnalisesQuery,
} from "./analises.schemas.js";
import { AnalisesService } from "./analises.service.js";
import { tarefasProducer } from "../tarefas/tarefas.producer.js";

export default async function analisesRoutes(app: FastifyInstance) {
  const controller = new AnalisesController(new AnalisesService());

  // Execução e manutenção do histórico analítico: administrador e auditor.
  app.addHook("onRequest", app.autenticar);
  app.addHook("onRequest", app.exigirPapel("ADMINISTRADOR", "AUDITOR"));

  const enfileirar = (tipo: "ANALISE_EFICIENCIA" | "ANALISE_RENTABILIDADE" | "ANALISE_VIDA_UTIL") =>
    async (request: import("fastify").FastifyRequest<{ Body: ExecutarAnaliseBody }>, reply: import("fastify").FastifyReply) => {
      const tarefa = await tarefasProducer.criar({
        tipo,
        parametros: request.body as unknown as Record<string, unknown>,
        organizacaoId: request.body.organizacaoId,
        escopoIdempotencia: `usuario:${request.user.sub}`,
        chaveIdempotencia: typeof request.headers["idempotency-key"] === "string" ? request.headers["idempotency-key"] : undefined,
      });
      return reply.code(202).send({ id: tarefa.id, status: tarefa.status, statusUrl: `/api/v1/tarefas/${tarefa.id}` });
    };

  app.post<{ Body: ExecutarAnaliseBody }>("/eficiencia", { schema: executarAnaliseSchema }, enfileirar("ANALISE_EFICIENCIA"));
  app.post<{ Body: ExecutarAnaliseBody }>("/rentabilidade", { schema: executarAnaliseSchema }, enfileirar("ANALISE_RENTABILIDADE"));
  app.post<{ Body: ExecutarAnaliseBody }>("/vida-util", { schema: executarAnaliseSchema }, enfileirar("ANALISE_VIDA_UTIL"));

  app.get<{ Querystring: ConsultarAnalisesQuery }>("/", { schema: consultarAnalisesSchema }, controller.listar);
  app.get<{ Params: ParamsId }>("/:id", { schema: resultadoAnaliseSchema }, controller.buscar);
  app.put<{ Params: ParamsId; Body: AtualizarAnaliseBody }>(
    "/:id", { schema: atualizarAnaliseSchema }, controller.atualizar,
  );
  app.delete<{ Params: ParamsId }>(
    "/:id", { schema: excluirAnaliseSchema }, controller.excluir,
  );
}
