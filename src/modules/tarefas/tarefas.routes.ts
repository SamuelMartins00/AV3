import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/prisma.js";
import { ErroDominio } from "../../dominio/erros.js";
import { StatusTarefa, TipoTarefa } from "../../generated/prisma/client.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { STATUS_RASTREAMENTO } from "../../dominio/enums.js";
import { filaTarefas } from "./tarefas.queue.js";
import { tarefasProducer } from "./tarefas.producer.js";

const tipos = Object.values(TipoTarefa);
const statusDisponiveis = Object.values(StatusTarefa);

const paramsIdSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", format: "uuid" } },
} as const;

export default async function tarefasRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.autenticar);
  app.addHook("onRequest", app.exigirPapel("ADMINISTRADOR", "AUDITOR"));

  // CREATE: cria o registro durável e publica o job; o worker é outro processo.
  app.post<{
    Body: {
      tipo: TipoTarefa;
      organizacaoId?: number;
      parametros?: Record<string, unknown>;
    };
  }>(
    "/",
    {
      schema: {
        tags: ["Tarefas assíncronas"],
        summary: "Cria e enfileira uma tarefa assíncrona",
        description:
          "Retorna 202 e o identificador da tarefa. Idempotência opcional por Idempotency-Key (8 a 128 caracteres).",
        security: [{ bearerAuth: [] }],
        headers: {
          type: "object",
          properties: {
            "idempotency-key": { type: "string", minLength: 8, maxLength: 128 },
          },
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["tipo"],
          properties: {
            tipo: { type: "string", enum: tipos },
            organizacaoId: { type: "integer", minimum: 1 },
            parametros: { type: "object", additionalProperties: true },
          },
        },
        response: {
          202: {
            description: "Tarefa persistida e aceita para processamento.",
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              status: { type: "string", enum: statusDisponiveis },
              statusUrl: { type: "string" },
            },
            required: ["id", "status", "statusUrl"],
          },
          400: { description: "Parâmetros inválidos." },
          401: { description: "JWT ausente ou inválido." },
          403: { description: "Papel sem autorização." },
          409: { description: "Idempotency-Key reutilizada com outro conteúdo." },
        },
      },
    },
    async (request, reply) => {
      const parametros = request.body.parametros ?? {};
      if (request.body.tipo === "GERACAO_RELATORIO") {
        const relatorio = parametros.relatorio;
        if (!["FINANCEIRO", "ORGANIZACAO", "STATUS"].includes(String(relatorio))) {
          throw new ErroDominio(
            "Informe parametros.relatorio: FINANCEIRO, ORGANIZACAO ou STATUS.",
            400,
          );
        }
        if (
          relatorio === "STATUS" &&
          !STATUS_RASTREAMENTO.includes(
            String(parametros.status) as (typeof STATUS_RASTREAMENTO)[number],
          )
        ) {
          throw new ErroDominio("Informe um status de rastreamento válido.", 400);
        }
        if (
          relatorio !== "STATUS" &&
          (typeof parametros.inicio !== "string" ||
            typeof parametros.fim !== "string")
        ) {
          throw new ErroDominio("Informe inicio e fim para o relatório.", 400);
        }
        if (relatorio === "ORGANIZACAO" && !request.body.organizacaoId) {
          throw new ErroDominio(
            "organizacaoId é obrigatório para relatório de organização.",
            400,
          );
        }
      }

      const key = request.headers["idempotency-key"];
      const tarefa = await tarefasProducer.criar({
        tipo: request.body.tipo,
        parametros,
        organizacaoId: request.body.organizacaoId,
        escopoIdempotencia: `usuario:${request.user.sub}`,
        chaveIdempotencia: typeof key === "string" ? key : undefined,
      });

      return reply.code(202).send({
        id: tarefa.id,
        status: tarefa.status,
        statusUrl: `/api/v1/tarefas/${tarefa.id}`,
      });
    },
  );

  // READ collection: filtros e paginação.
  app.get<{
    Querystring: {
      status?: StatusTarefa;
      tipo?: TipoTarefa;
      pagina?: number;
      limite?: number;
    };
  }>(
    "/",
    {
      schema: {
        tags: ["Tarefas assíncronas"],
        summary: "Lista tarefas com filtros e paginação",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            status: { type: "string", enum: statusDisponiveis },
            tipo: { type: "string", enum: tipos },
            pagina: { type: "integer", minimum: 1, default: 1 },
            limite: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              dados: { type: "array", items: { type: "object", additionalProperties: true } },
              pagina: { type: "integer" },
              limite: { type: "integer" },
              total: { type: "integer" },
              totalPaginas: { type: "integer" },
            },
            required: ["dados", "pagina", "limite", "total", "totalPaginas"],
          },
        },
      },
    },
    async (request) => {
      const pagina = request.query.pagina ?? 1;
      const limite = request.query.limite ?? 20;
      const where = {
        ...(request.query.status ? { status: request.query.status } : {}),
        ...(request.query.tipo ? { tipo: request.query.tipo } : {}),
      };

      const [dados, total] = await prisma.$transaction([
        prisma.tarefaAssincrona.findMany({
          where,
          orderBy: { criadoEm: "desc" },
          skip: (pagina - 1) * limite,
          take: limite,
          select: {
            id: true,
            tipo: true,
            status: true,
            organizacaoId: true,
            tentativas: true,
            maxTentativas: true,
            erro: true,
            criadoEm: true,
            iniciadaEm: true,
            concluidaEm: true,
            resultadoExpiraEm: true,
          },
        }),
        prisma.tarefaAssincrona.count({ where }),
      ]);

      return {
        dados,
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite),
      };
    },
  );

  // READ item: consulta estado e resultado.
  app.get<{ Params: { id: string } }>(
    "/:id",
    {
      schema: {
        tags: ["Tarefas assíncronas"],
        summary: "Consulta estado, tentativas e resultado de uma tarefa",
        security: [{ bearerAuth: [] }],
        params: paramsIdSchema,
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              id: { type: "string", format: "uuid" },
              tipo: { type: "string", enum: tipos },
              status: { type: "string", enum: statusDisponiveis },
              tentativas: { type: "integer" },
              maxTentativas: { type: "integer" },
              resultadoDisponivel: { type: "boolean" },
              downloadUrl: { type: ["string", "null"] },
            },
          },
          404: { description: "Tarefa não encontrada." },
        },
      },
    },
    async (request) => {
      const tarefa = await prisma.tarefaAssincrona.findUnique({
        where: { id: request.params.id },
      });
      if (!tarefa) throw new ErroDominio("Tarefa não encontrada", 404);

      const expirado =
        tarefa.resultadoExpiraEm !== null &&
        tarefa.resultadoExpiraEm <= new Date();

      return {
        id: tarefa.id,
        tipo: tarefa.tipo,
        status: tarefa.status,
        tentativas: tarefa.tentativas,
        maxTentativas: tarefa.maxTentativas,
        erro: tarefa.erro,
        criadoEm: tarefa.criadoEm,
        iniciadaEm: tarefa.iniciadaEm,
        concluidaEm: tarefa.concluidaEm,
        resultadoDisponivel:
          tarefa.status === "CONCLUIDA" &&
          tarefa.resultado !== null &&
          !expirado,
        formatoArquivo: tarefa.formatoArquivo,
        resultadoExpiraEm: tarefa.resultadoExpiraEm,
        downloadUrl:
          tarefa.status === "CONCLUIDA" &&
          tarefa.resultado !== null &&
          !expirado
            ? `/api/v1/tarefas/${tarefa.id}/download`
            : null,
        resultado:
          tarefa.status === "CONCLUIDA" && !expirado
            ? tarefa.resultado
            : null,
      };
    },
  );

  // UPDATE controlado: a única alteração permitida é cancelar uma tarefa pendente.
  // Parâmetros e tipo são imutáveis depois do enfileiramento.
  app.patch<{
    Params: { id: string };
    Body: {
      acao?: "CANCELAR";
      parametros?: Record<string, unknown>;
    };
  }>(
    "/:id",
    {
      schema: {
        tags: ["Tarefas assíncronas"],
        summary: "Atualiza parâmetros de tarefa pendente ou solicita cancelamento",
        description:
          "Permite alterar parametros somente enquanto PENDENTE, ou cancelar uma tarefa PENDENTE com acao=CANCELAR. Tipo é imutável. Tarefas PROCESSANDO ou terminais não podem ser alteradas.",
        security: [{ bearerAuth: [] }],
        params: paramsIdSchema,
        body: {
          oneOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["acao"],
              properties: { acao: { type: "string", enum: ["CANCELAR"] } },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["parametros"],
              properties: {
                parametros: { type: "object", additionalProperties: true },
              },
            },
          ],
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              status: { type: "string", enum: ["PENDENTE", "CANCELADA"] },
            },
            required: ["id", "status"],
          },
          404: { description: "Tarefa não encontrada." },
          409: { description: "A tarefa não está mais pendente." },
        },
      },
    },
    async (request) => {
      const tarefa = await prisma.tarefaAssincrona.findUnique({
        where: { id: request.params.id },
        select: { id: true, status: true, tipo: true },
      });
      if (!tarefa) throw new ErroDominio("Tarefa não encontrada", 404);

      if (request.body.acao === "CANCELAR") {
        const atualizada = await prisma.tarefaAssincrona.updateMany({
          where: { id: tarefa.id, status: "PENDENTE" },
          data: { status: "CANCELADA", concluidaEm: new Date(), erro: null },
        });
        if (!atualizada.count) {
          throw new ErroDominio(
            "Somente tarefas pendentes podem ser canceladas.",
            409,
          );
        }

        // O estado no MySQL é a fonte de verdade. Se o job ainda estiver no Redis,
        // tentamos removê-lo; o worker também faz reivindicação condicional no banco.
        try {
          const job = await filaTarefas.getJob(tarefa.id);
          if (job) await job.remove();
        } catch (erro) {
          request.log.warn(
            { erro, tarefaId: tarefa.id },
            "Não foi possível remover o job cancelado do Redis",
          );
        }

        return { id: tarefa.id, status: "CANCELADA" as const };
      }

      if (!request.body.parametros) {
        throw new ErroDominio("Informe parametros para atualizar a tarefa.", 400);
      }

      if (tarefa.tipo === "GERACAO_RELATORIO") {
        const relatorio = request.body.parametros.relatorio;
        if (!["FINANCEIRO", "ORGANIZACAO", "STATUS"].includes(String(relatorio))) {
          throw new ErroDominio("Tipo de relatório inválido.", 400);
        }
        if (
          relatorio === "STATUS" &&
          !STATUS_RASTREAMENTO.includes(
            String(request.body.parametros.status) as (typeof STATUS_RASTREAMENTO)[number],
          )
        ) {
          throw new ErroDominio("Status de rastreamento inválido.", 400);
        }
        if (
          relatorio !== "STATUS" &&
          (typeof request.body.parametros.inicio !== "string" ||
            typeof request.body.parametros.fim !== "string")
        ) {
          throw new ErroDominio("Informe inicio e fim para o relatório.", 400);
        }
      }

      const atualizada = await prisma.tarefaAssincrona.updateMany({
        where: { id: tarefa.id, status: "PENDENTE" },
        data: {
          parametros: request.body.parametros as Prisma.InputJsonValue,
        },
      });
      if (!atualizada.count) {
        throw new ErroDominio(
          "Somente tarefas pendentes podem ter seus parâmetros alterados.",
          409,
        );
      }

      return { id: tarefa.id, status: "PENDENTE" as const };
    },
  );

  // DELETE: remoção física apenas depois do término/cancelamento.
  app.delete<{ Params: { id: string } }>(
    "/:id",
    {
      schema: {
        tags: ["Tarefas assíncronas"],
        summary: "Remove uma tarefa terminal do histórico",
        description:
          "A exclusão física é permitida somente para tarefas CONCLUIDA, FALHOU ou CANCELADA. Tarefas pendentes/em processamento devem ser canceladas ou concluídas primeiro.",
        security: [{ bearerAuth: [] }],
        params: paramsIdSchema,
        response: {
          204: { description: "Tarefa removida." },
          404: { description: "Tarefa não encontrada." },
          409: { description: "A tarefa ainda não está em estado terminal." },
        },
      },
    },
    async (request, reply) => {
      const tarefa = await prisma.tarefaAssincrona.findUnique({
        where: { id: request.params.id },
        select: { id: true, status: true },
      });
      if (!tarefa) throw new ErroDominio("Tarefa não encontrada", 404);

      if (!["CONCLUIDA", "FALHOU", "CANCELADA"].includes(tarefa.status)) {
        throw new ErroDominio(
          "Somente tarefas concluídas, falhas ou canceladas podem ser excluídas.",
          409,
        );
      }

      try {
        const job = await filaTarefas.getJob(tarefa.id);
        if (job) await job.remove();
      } catch (erro) {
        request.log.warn({ erro, tarefaId: tarefa.id }, "Não foi possível remover o job terminal do Redis");
      }

      await prisma.tarefaAssincrona.delete({ where: { id: tarefa.id } });
      return reply.code(204).send();
    },
  );

  // Download privado: o resultado nunca é servido por diretório público.
  app.get<{ Params: { id: string } }>(
    "/:id/download",
    {
      schema: {
        tags: ["Tarefas assíncronas"],
        summary: "Baixa resultado JSON de tarefa concluída",
        security: [{ bearerAuth: [] }],
        params: paramsIdSchema,
        response: {
          200: { description: "Resultado JSON da tarefa." },
          404: { description: "Tarefa não encontrada." },
          409: { description: "Resultado ainda não disponível." },
          410: { description: "Resultado expirado." },
        },
      },
    },
    async (request, reply) => {
      const tarefa = await prisma.tarefaAssincrona.findUnique({
        where: { id: request.params.id },
      });
      if (!tarefa) throw new ErroDominio("Tarefa não encontrada", 404);
      if (tarefa.status !== "CONCLUIDA" || tarefa.resultado === null) {
        throw new ErroDominio("O resultado ainda não está disponível", 409);
      }
      if (
        tarefa.resultadoExpiraEm &&
        tarefa.resultadoExpiraEm <= new Date()
      ) {
        throw new ErroDominio("O resultado expirou", 410);
      }

      reply.type("application/json; charset=utf-8");
      reply.header(
        "content-disposition",
        `attachment; filename="tarefa-${tarefa.id}.json"`,
      );
      return reply.send(JSON.stringify(tarefa.resultado, null, 2));
    },
  );
}
