import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/prisma.js";
import { ErroDominio } from "../../dominio/erros.js";
import type { PermissaoChaveApi } from "../../generated/prisma/client.js";
import rateLimit from "@fastify/rate-limit";
import { LotesService } from "../lotes/lotes.service.js";
import type { CriarLoteBody } from "../lotes/lotes.schemas.js";
import { TIPOS_EQUIPAMENTO, ESTADOS_FISICOS } from "../../dominio/enums.js";
import { createHash } from "node:crypto";

export default async function publicaRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { global: true, max: 120, timeWindow: "1 minute", keyGenerator: (request) => { const presented = request.headers["x-api-key"]; return typeof presented === "string" ? `api-key:${createHash("sha256").update(presented).digest("hex")}` : request.ip; }, errorResponseBuilder: () => ({ erro: "Limite de requisições excedido" }) });
  app.addHook("onRequest", app.autenticarApiKey);
  const exigir = (p: PermissaoChaveApi) => async (req: any) => { if (!req.apiKey.permissoes.includes(p)) throw new ErroDominio("A chave não possui a permissão necessária", 403); };

  app.post<{ Body: Omit<CriarLoteBody, "organizacaoId"> }>("/lotes", { onRequest: [exigir("LOTES_ESCRITA")], schema: { tags: ["API Pública v1"], summary: "Cria lote para a organização vinculada à API key", description: "organizacaoId é obtido exclusivamente da chave autenticada e não é aceito no corpo.", security: [{ apiKeyAuth: [] }], body: { type: "object", additionalProperties: false, required: ["dataEntrada", "notaFiscal", "transportadora"], properties: { dataEntrada: { type: "string", minLength: 10, maxLength: 40 }, notaFiscal: { type: "string", minLength: 1, maxLength: 60 }, transportadora: { type: "string", minLength: 1, maxLength: 120 }, observacoes: { type: "string", maxLength: 2000 }, equipamentos: { type: "array", maxItems: 500, items: { type: "object", additionalProperties: false, required: ["tipo", "marca", "modelo", "anoFabricacao", "estadoFisico", "pesoQuilogramas"], properties: { tipo: { type: "string", enum: [...TIPOS_EQUIPAMENTO] }, marca: { type: "string", minLength: 1, maxLength: 100 }, modelo: { type: "string", minLength: 1, maxLength: 100 }, anoFabricacao: { type: "integer", minimum: 1950, maximum: 2100 }, estadoFisico: { type: "string", enum: [...ESTADOS_FISICOS] }, pesoQuilogramas: { type: "number", exclusiveMinimum: 0, maximum: 99999.999 } } } } } }, response: { 201: { description: "Lote criado." }, 401: { description: "API key ausente ou inválida." }, 403: { description: "Escopo LOTES_ESCRITA ausente." }, 422: { description: "Dados do lote inválidos." } } } }, async (req, reply) => {
    const body: CriarLoteBody = { ...req.body, organizacaoId: req.apiKey.organizacaoId };
    const criado = await new LotesService().criar(body, `API_KEY:${req.apiKey.id}`);
    return reply.code(201).send(criado);
  });

  app.get<{ Querystring: { limite?: number; pagina?: number } }>("/lotes", { onRequest: [exigir("LOTES_LEITURA")], schema: { tags: ["API Pública v1"], summary: "Lista lotes da organização autenticada", security: [{ apiKeyAuth: [] }], querystring: { type: "object", additionalProperties: false, properties: { limite: { type: "integer", minimum: 1, maximum: 100, default: 20 }, pagina: { type: "integer", minimum: 1, maximum: 100000, default: 1 } } } } }, async (req) => prisma.lote.findMany({ where: { organizacaoId: req.apiKey.organizacaoId }, select: { id: true, dataEntrada: true, statusProcessamento: true, triagemConcluidaEm: true, observacoes: true, _count: { select: { equipamentos: true } } }, orderBy: { dataEntrada: "desc" }, skip: ((req.query.pagina ?? 1) - 1) * (req.query.limite ?? 20), take: req.query.limite ?? 20 }));

  app.get<{ Params: { id: number } }>("/lotes/:id", { onRequest: [exigir("LOTES_LEITURA")], schema: { tags: ["API Pública v1"], summary: "Consulta lote do parceiro autenticado", security: [{ apiKeyAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "integer", minimum: 1 } } } } }, async (req) => {
    const lote = await prisma.lote.findFirst({ where: { id: req.params.id, organizacaoId: req.apiKey.organizacaoId }, include: { equipamentos: { orderBy: { posicaoNoLote: "asc" } } } });
    if (!lote) throw new ErroDominio("Lote não encontrado", 404);
    return lote;
  });

  app.get<{ Params: { id: number } }>("/equipamentos/:id/rastreabilidade", { onRequest: [exigir("RASTREABILIDADE_LEITURA")], schema: { tags: ["API Pública v1"], summary: "Consulta rastreabilidade de equipamento do parceiro", security: [{ apiKeyAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "integer", minimum: 1 } } } } }, async (req) => {
    const equipamento = await prisma.equipamento.findFirst({ where: { id: req.params.id, lote: { organizacaoId: req.apiKey.organizacaoId } }, include: { lote: { select: { id: true, organizacaoId: true, dataEntrada: true } }, movimentacoes: { orderBy: { dataHora: "asc" } } } });
    if (!equipamento) throw new ErroDominio("Equipamento não encontrado", 404);
    return equipamento;
  });

  app.get<{ Querystring: { limite?: number; tipo?: string } }>("/analises", { onRequest: [exigir("ANALISES_LEITURA")], schema: { tags: ["API Pública v1"], summary: "Lista resultados analíticos da organização da chave", security: [{ apiKeyAuth: [] }], querystring: { type: "object", additionalProperties: false, properties: { limite: { type: "integer", minimum: 1, maximum: 100, default: 20 }, tipo: { type: "string", enum: ["EFICIENCIA_OPERACIONAL", "RENTABILIDADE_EQUIPAMENTOS", "VIDA_UTIL_REMANESCENTE"] } } } } }, async (req) => prisma.resultadoAnalitico.findMany({ where: { organizacaoId: req.apiKey.organizacaoId, tipo: req.query.tipo as any }, orderBy: { geradoEm: "desc" }, take: req.query.limite ?? 20 }));
}
