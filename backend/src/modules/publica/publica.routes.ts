import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/prisma.js";
import { ErroDominio } from "../../dominio/erros.js";
import type { PermissaoChaveApi } from "../../generated/prisma/client.js";
import rateLimit from "@fastify/rate-limit";
import { LotesService } from "../lotes/lotes.service.js";
import type { CriarLoteBody } from "../lotes/lotes.schemas.js";
import { TIPOS_EQUIPAMENTO, ESTADOS_FISICOS } from "../../dominio/enums.js";
import { createHash } from "node:crypto";
import { tarefasProducer } from "../tarefas/tarefas.producer.js";

export default async function publicaRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { global: true, max: 120, timeWindow: "1 minute", keyGenerator: (request) => { const presented = request.headers["x-api-key"]; return typeof presented === "string" ? `api-key:${createHash("sha256").update(presented).digest("hex")}` : request.ip; }, errorResponseBuilder: (_request, contexto) => ({ statusCode: contexto.statusCode, message: "Limite de requisições excedido", codigo: "LIMITE_REQUISICOES" }) });
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
  // Solicitação de relatório analítico por parceiro. A organização e a chave
  // são sempre derivadas da API key autenticada, nunca do payload enviado.
  app.post<{
    Body: { tipo?: "ANALISE_COMPLETA" | "ANALISE_EFICIENCIA" | "ANALISE_RENTABILIDADE" | "ANALISE_VIDA_UTIL"; inicio?: string; fim?: string; limiteAmostra?: number };
  }>("/analises", {
    onRequest: [exigir("ANALISES_LEITURA")],
    schema: {
      tags: ["API Pública v1"],
      summary: "Solicita geração assíncrona de relatório analítico",
      description: "Cria uma tarefa BullMQ e retorna HTTP 202. A organização é vinculada à API key. Use GET /tarefas/{id} para polling e /tarefas/{id}/download quando concluída. Se tipo for omitido, gera as três análises.",
      security: [{ apiKeyAuth: [] }],
      headers: { type: "object", properties: { "idempotency-key": { type: "string", minLength: 8, maxLength: 128 } } },
      body: {
        type: "object", additionalProperties: false,
        examples: [{ tipo: "ANALISE_COMPLETA", inicio: "2026-01-01T00:00:00.000Z", fim: "2026-12-31T23:59:59.999Z" }],
        properties: {
          tipo: { type: "string", enum: ["ANALISE_COMPLETA", "ANALISE_EFICIENCIA", "ANALISE_RENTABILIDADE", "ANALISE_VIDA_UTIL"], default: "ANALISE_COMPLETA" },
          inicio: { type: "string", format: "date-time" }, fim: { type: "string", format: "date-time" },
          limiteAmostra: { type: "integer", minimum: 3, maximum: 10000 },
        },
      },
      response: { 202: { description: "Relatório aceito para processamento assíncrono.", type: "object", properties: { id: { type: "string", format: "uuid", example: "d5b7b82c-3c8b-4e91-b3f8-1d1c7a2d9b20" }, status: { type: "string", example: "PENDENTE" }, statusUrl: { type: "string", example: "/api/v1/public/tarefas/d5b7b82c-3c8b-4e91-b3f8-1d1c7a2d9b20" }, downloadUrl: { type: "string", example: "/api/v1/public/tarefas/d5b7b82c-3c8b-4e91-b3f8-1d1c7a2d9b20/download" } }, required: ["id", "status", "statusUrl", "downloadUrl"] }, 400: { description: "Período inválido ou maior que 366 dias." }, 403: { description: "Escopo ANALISES_LEITURA ausente." }, 409: { description: "Idempotency-Key reutilizada com parâmetros diferentes." } },
    },
  }, async (req, reply) => {
    const inicio = req.body.inicio ? new Date(req.body.inicio) : undefined;
    const fim = req.body.fim ? new Date(req.body.fim) : undefined;
    if ((inicio && !Number.isFinite(inicio.getTime())) || (fim && !Number.isFinite(fim.getTime()))) {
      throw new ErroDominio("Informe datas válidas para o período da análise.", 400);
    }
    if (inicio && fim && inicio > fim) throw new ErroDominio("A data inicial deve ser anterior ou igual à data final.", 400);
    if (inicio && fim && fim.getTime() - inicio.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new ErroDominio("O período máximo permitido é de 366 dias.", 400);
    }
    const tipo = req.body.tipo ?? "ANALISE_COMPLETA";
    const parametros = {
      organizacaoId: req.apiKey.organizacaoId,
      ...(req.body.inicio ? { inicio: req.body.inicio } : {}),
      ...(req.body.fim ? { fim: req.body.fim } : {}),
      ...(req.body.limiteAmostra !== undefined ? { limiteAmostra: req.body.limiteAmostra } : {}),
    };
    const chave = req.headers["idempotency-key"];
    const tarefa = await tarefasProducer.criar({
      tipo, parametros, organizacaoId: req.apiKey.organizacaoId, chaveApiId: req.apiKey.id,
      escopoIdempotencia: `api-key:${req.apiKey.id}`,
      chaveIdempotencia: typeof chave === "string" ? chave : undefined,
    });
    return reply.code(202).send({ id: tarefa.id, status: tarefa.status,
      statusUrl: `/api/v1/public/tarefas/${tarefa.id}`,
      downloadUrl: `/api/v1/public/tarefas/${tarefa.id}/download` });
  });

  // Polling público com isolamento simultâneo por organização e API key.
  app.get<{ Params: { id: string } }>("/tarefas/:id", {
    onRequest: [exigir("ANALISES_LEITURA")],
    schema: { tags: ["API Pública v1"], summary: "Consulta status e resultado da tarefa analítica", security: [{ apiKeyAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } }, response: { 200: { description: "Estado da tarefa e resultado quando concluído.", type: "object", properties: { id: { type: "string", format: "uuid" }, tipo: { type: "string" }, status: { type: "string", enum: ["PENDENTE", "PROCESSANDO", "CONCLUIDA", "FALHOU", "CANCELADA"] }, tentativas: { type: "integer" }, maxTentativas: { type: "integer" }, resultadoDisponivel: { type: "boolean" }, downloadUrl: { type: ["string", "null"] }, resultado: { type: ["object", "null"], additionalProperties: true } } }, 404: { description: "Tarefa não encontrada para esta chave." } } },
  }, async (req) => {
    const tarefa = await prisma.tarefaAssincrona.findFirst({ where: { id: req.params.id, organizacaoId: req.apiKey.organizacaoId, chaveApiId: req.apiKey.id } });
    if (!tarefa) throw new ErroDominio("Tarefa não encontrada", 404);
    const expirado = tarefa.resultadoExpiraEm !== null && tarefa.resultadoExpiraEm <= new Date();
    const resultadoDisponivel = tarefa.status === "CONCLUIDA" && tarefa.resultado !== null && !expirado;
    return { id: tarefa.id, tipo: tarefa.tipo, status: tarefa.status, tentativas: tarefa.tentativas,
      maxTentativas: tarefa.maxTentativas, erro: tarefa.erro, criadoEm: tarefa.criadoEm,
      iniciadaEm: tarefa.iniciadaEm, concluidaEm: tarefa.concluidaEm, resultadoDisponivel,
      resultadoExpiraEm: tarefa.resultadoExpiraEm,
      downloadUrl: resultadoDisponivel ? `/api/v1/public/tarefas/${tarefa.id}/download` : null,
      resultado: resultadoDisponivel ? tarefa.resultado : null };
  });

  app.get<{ Params: { id: string } }>("/tarefas/:id/download", {
    onRequest: [exigir("ANALISES_LEITURA")],
    schema: { tags: ["API Pública v1"], summary: "Baixa o resultado JSON da análise concluída", security: [{ apiKeyAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } }, response: { 200: { description: "Arquivo JSON do relatório." }, 404: { description: "Tarefa não encontrada para esta chave." }, 409: { description: "Relatório ainda não concluído." }, 410: { description: "Resultado expirado." } } },
  }, async (req, reply) => {
    const tarefa = await prisma.tarefaAssincrona.findFirst({ where: { id: req.params.id, organizacaoId: req.apiKey.organizacaoId, chaveApiId: req.apiKey.id } });
    if (!tarefa) throw new ErroDominio("Tarefa não encontrada", 404);
    if (tarefa.status !== "CONCLUIDA" || tarefa.resultado === null) throw new ErroDominio("O resultado ainda não está disponível", 409);
    if (tarefa.resultadoExpiraEm && tarefa.resultadoExpiraEm <= new Date()) throw new ErroDominio("O resultado expirou", 410);
    reply.type("application/json; charset=utf-8");
    reply.header("content-disposition", `attachment; filename="relatorio-${tarefa.id}.json"`);
    return reply.send(JSON.stringify(tarefa.resultado, null, 2));
  });
}
