import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/prisma.js";

// Lista mínima de organizações para preencher seletores no front-end.
// Fica fora de organizacoes.routes.ts de propósito: aquele plugin restringe
// todas as rotas a ADMINISTRADOR/OPERADOR_CADASTRO, mas o GESTOR_ALMOXARIFADO
// precisa escolher a organização ao criar lote e o AUDITOR ao filtrar
// relatórios e análises. Só expõe id, razão social e situação (sem CNPJ,
// contrato ou contatos).
export default async function organizacoesOpcoesRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { todas?: boolean; razaoSocial?: string } }>(
    "/opcoes",
    {
      onRequest: [
        app.autenticar,
        app.exigirPapel("ADMINISTRADOR", "OPERADOR_CADASTRO", "GESTOR_ALMOXARIFADO", "AUDITOR"),
      ],
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            todas: { type: "boolean", description: "Inclui organizações inativas (padrão: somente ativas)." },
            razaoSocial: { type: "string", minLength: 1, maxLength: 200 },
          },
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                razaoSocial: { type: "string" },
                ativo: { type: "boolean" },
              },
              required: ["id", "razaoSocial", "ativo"],
            },
          },
        },
      },
    },
    async (request) => {
      const termo = request.query.razaoSocial?.trim();
      return prisma.organizacao.findMany({
        where: {
          ...(request.query.todas === true ? {} : { ativo: true }),
          ...(termo ? { razaoSocial: { contains: termo } } : {}),
        },
        select: { id: true, razaoSocial: true, ativo: true },
        orderBy: { razaoSocial: "asc" },
        take: 500,
      });
    },
  );
}
