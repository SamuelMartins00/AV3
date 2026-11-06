import type { FastifyInstance } from "fastify";
import type { ParamsId } from "../compartilhado/params.js";
import { AnalisesController } from "./analises.controller.js";
import { executarAnaliseSchema, consultarAnalisesSchema, resultadoAnaliseSchema, type ExecutarAnaliseBody, type ConsultarAnalisesQuery } from "./analises.schemas.js";
import { AnalisesService } from "./analises.service.js";
export default async function analisesRoutes(app: FastifyInstance) {
  const controller = new AnalisesController(new AnalisesService());
  app.addHook("onRequest", app.autenticar);
  app.addHook("onRequest", app.exigirPapel("ADMINISTRADOR", "AUDITOR"));
  app.post<{ Body: ExecutarAnaliseBody }>("/eficiencia", { schema: executarAnaliseSchema }, controller.eficiencia);
  app.post<{ Body: ExecutarAnaliseBody }>("/rentabilidade", { schema: executarAnaliseSchema }, controller.rentabilidade);
  app.post<{ Body: ExecutarAnaliseBody }>("/vida-util", { schema: executarAnaliseSchema }, controller.vidaUtil);
  app.get<{ Querystring: ConsultarAnalisesQuery }>("/", { schema: consultarAnalisesSchema }, controller.listar);
  app.get<{ Params: ParamsId }>("/:id", { schema: resultadoAnaliseSchema }, controller.buscar);
}
