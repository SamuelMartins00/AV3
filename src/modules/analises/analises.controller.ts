import type { FastifyReply, FastifyRequest } from "fastify";
import type { ParamsId } from "../compartilhado/params.js";
import type { ExecutarAnaliseBody, ConsultarAnalisesQuery, AtualizarAnaliseBody } from "./analises.schemas.js";
import type { AnalisesService } from "./analises.service.js";
export class AnalisesController {
  constructor(private readonly service: AnalisesService) {}
  eficiencia = async (request: FastifyRequest<{ Body: ExecutarAnaliseBody }>, reply: FastifyReply) => reply.code(201).send(await this.service.eficiencia(request.body));
  rentabilidade = async (request: FastifyRequest<{ Body: ExecutarAnaliseBody }>, reply: FastifyReply) => reply.code(201).send(await this.service.rentabilidade(request.body));
  vidaUtil = async (request: FastifyRequest<{ Body: ExecutarAnaliseBody }>, reply: FastifyReply) => reply.code(201).send(await this.service.vidaUtil(request.body));
  listar = async (request: FastifyRequest<{ Querystring: ConsultarAnalisesQuery }>) => this.service.listar(request.query);
  buscar = async (request: FastifyRequest<{ Params: ParamsId }>) => this.service.buscar(request.params.id);
  atualizar = async (request: FastifyRequest<{ Params: ParamsId; Body: AtualizarAnaliseBody }>) =>
    this.service.atualizar(request.params.id, request.body);
  excluir = async (request: FastifyRequest<{ Params: ParamsId }>, reply: FastifyReply) => {
    await this.service.excluir(request.params.id);
    return reply.code(204).send();
  };
}
