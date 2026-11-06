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

export default async function analisesRoutes(app: FastifyInstance) {
  const controller = new AnalisesController(new AnalisesService());

  // Execução e manutenção do histórico analítico: administrador e auditor.
  app.addHook("onRequest", app.autenticar);
  app.addHook("onRequest", app.exigirPapel("ADMINISTRADOR", "AUDITOR"));

  app.post<{ Body: ExecutarAnaliseBody }>("/eficiencia", { schema: executarAnaliseSchema }, controller.eficiencia);
  app.post<{ Body: ExecutarAnaliseBody }>("/rentabilidade", { schema: executarAnaliseSchema }, controller.rentabilidade);
  app.post<{ Body: ExecutarAnaliseBody }>("/vida-util", { schema: executarAnaliseSchema }, controller.vidaUtil);

  app.get<{ Querystring: ConsultarAnalisesQuery }>("/", { schema: consultarAnalisesSchema }, controller.listar);
  app.get<{ Params: ParamsId }>("/:id", { schema: resultadoAnaliseSchema }, controller.buscar);
  app.put<{ Params: ParamsId; Body: AtualizarAnaliseBody }>(
    "/:id", { schema: atualizarAnaliseSchema }, controller.atualizar,
  );
  app.delete<{ Params: ParamsId }>(
    "/:id", { schema: excluirAnaliseSchema }, controller.excluir,
  );
}
