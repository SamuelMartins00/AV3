
import type { FastifyInstance } from "fastify";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { ErroDominio } from "../../dominio/erros.js";
import { PermissaoChaveApi } from "../../generated/prisma/client.js";
import type { Prisma } from "../../generated/prisma/client.js";

const permissoesValidas = Object.values(PermissaoChaveApi);

const hash = (segredo: string) =>
  createHash("sha256").update(segredo).digest("hex");

const segredoNovo = () =>
  `gcp_live_${randomBytes(32).toString("base64url")}`;

const publico = {
  id: true,
  organizacaoId: true,
  nome: true,
  prefixo: true,
  permissoes: true,
  ativa: true,
  expiraEm: true,
  ultimoUsoEm: true,
  criadoEm: true,
  revogadoEm: true,
} as const;

export default async function chavesApiRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.autenticar);
  app.addHook("onRequest", app.exigirPapel("ADMINISTRADOR"));

  // Criar chave de API
  app.post<{
    Body: {
      organizacaoId: number;
      nome: string;
      permissoes: PermissaoChaveApi[];
      expiraEm?: string;
    };
  }>(
    "/",
    {
      schema: {
        tags: ["Chaves de API"],
        summary:
          "Cria chave de API para parceiro; o segredo é exibido uma única vez",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["organizacaoId", "nome", "permissoes"],
          properties: {
            organizacaoId: { type: "integer", minimum: 1 },
            nome: { type: "string", minLength: 2, maxLength: 80 },
            permissoes: {
              type: "array",
              description:
                "Permissões efetivamente exigidas hoje pela API pública: LOTES_ESCRITA, LOTES_LEITURA, RASTREABILIDADE_LEITURA e ANALISES_LEITURA. EQUIPAMENTOS_LEITURA, RELATORIOS_LEITURA, TAREFAS_LEITURA e TAREFAS_ESCRITA estão reservadas e ainda não habilitam nenhuma rota.",
              minItems: 1,
              uniqueItems: true,
              items: {
                type: "string",
                enum: permissoesValidas,
              },
            },
            expiraEm: {
              type: "string",
              format: "date-time",
            },
          },
        },
        response: {
          201: {
            description:
              "Chave criada. O segredo será exibido somente nesta resposta.",
            type: "object",
            properties: {
              chave: {
                type: "object",
                additionalProperties: true,
              },
              segredo: {
                type: "string",
                example: "gcp_live_<segredo-gerado>",
              },
            },
            required: ["chave", "segredo"],
          },
          400: { description: "Dados ou permissões inválidos." },
          401: { description: "JWT ausente ou inválido." },
          403: {
            description: "Somente administrador pode gerenciar chaves.",
          },
          404: {
            description: "Organização inexistente ou inativa.",
          },
        },
      },
    },
    async (request, reply) => {
      const org = await prisma.organizacao.findUnique({
        where: { id: request.body.organizacaoId },
        select: { id: true, ativo: true },
      });

      if (!org || !org.ativo) {
        throw new ErroDominio(
          "Organização inexistente ou inativa",
          404
        );
      }

      if (
        request.body.expiraEm &&
        new Date(request.body.expiraEm) <= new Date()
      ) {
        throw new ErroDominio(
          "A expiração deve estar no futuro",
          422
        );
      }

      const secret = segredoNovo();
      const prefixo = secret.slice(0, 16);

      const chave = await prisma.chaveApi.create({
        data: {
          organizacaoId: org.id,
          nome: request.body.nome.trim(),
          prefixo,
          hashChave: hash(secret),
          permissoes: request.body.permissoes,
          expiraEm: request.body.expiraEm
            ? new Date(request.body.expiraEm)
            : null,
        },
        select: publico,
      });

      return reply.code(201).send({
        chave,
        segredo: secret,
      });
    }
  );

  // Listar chaves de API
  app.get<{
    Querystring: {
      organizacaoId?: number;
    };
  }>(
    "/",
    {
      schema: {
        tags: ["Chaves de API"],
        summary:
          "Lista metadados das chaves (nunca retorna segredo ou hash)",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            organizacaoId: {
              type: "integer",
              minimum: 1,
            },
          },
        },
      },
    },
    async (request) => {
      return prisma.chaveApi.findMany({
        where: {
          organizacaoId: request.query.organizacaoId,
        },
        select: publico,
        orderBy: {
          criadoEm: "desc",
        },
        take: 100,
      });
    }
  );

  // Consultar chave por ID
  app.get<{
    Params: {
      id: number;
    };
  }>(
    "/:id",
    {
      schema: {
        tags: ["Chaves de API"],
        summary: "Consulta metadados de uma chave",
        description:
          "Retorna apenas metadados; segredo e hash nunca são recuperáveis.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "integer",
              minimum: 1,
            },
          },
        },
        response: {
          404: {
            description: "Chave não encontrada.",
          },
        },
      },
    },
    async (request) => {
      const chave = await prisma.chaveApi.findUnique({
        where: {
          id: request.params.id,
        },
        select: publico,
      });

      if (!chave) {
        throw new ErroDominio("Chave não encontrada", 404);
      }

      return chave;
    }
  );

  // Revogar chave de API
  app.post<{
    Params: {
      id: number;
    };
  }>(
    "/:id/revogar",
    {
      schema: {
        tags: ["Chaves de API"],
        summary: "Revoga uma chave de API",
        description:
          "Revogação imediata. A chave deixa de autenticar novas requisições.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "integer",
              minimum: 1,
            },
          },
        },
        response: {
          204: {
            type: "null",
          },
        },
      },
    },
    async (request, reply) => {
      const result = await prisma.chaveApi.updateMany({
        where: {
          id: request.params.id,
          ativa: true,
        },
        data: {
          ativa: false,
          revogadoEm: new Date(),
        },
      });

      if (!result.count) {
        throw new ErroDominio(
          "Chave não encontrada ou já revogada",
          404
        );
      }

      return reply.code(204).send();
    }
  );

  // Rotacionar chave de API
  app.post<{
    Params: {
      id: number;
    };
  }>(
    "/:id/rotacionar",
    {
      schema: {
        tags: ["Chaves de API"],
        summary:
          "Revoga a chave atual e emite novo segredo de uso único",
        description:
          "Rotação atômica: chave anterior revogada e nova chave criada com o mesmo parceiro e escopos. Armazene o segredo retornado; ele não poderá ser recuperado.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "integer",
              minimum: 1,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const secret = segredoNovo();
      const prefixo = secret.slice(0, 16);

      const atualizado = await prisma.$transaction(async (tx) => {
        const antiga = await tx.chaveApi.findUnique({
          where: {
            id: request.params.id,
          },
        });

        if (!antiga || !antiga.ativa) {
          throw new ErroDominio(
            "Chave não encontrada ou já revogada",
            404
          );
        }

        if (
          antiga.expiraEm &&
          antiga.expiraEm <= new Date()
        ) {
          throw new ErroDominio(
            "Não é possível rotacionar uma chave expirada",
            422
          );
        }

        const permissoes = antiga.permissoes;

        if (
          permissoes === null ||
          typeof permissoes !== "object" ||
          Array.isArray(permissoes)
        ) {
          throw new ErroDominio(
            "Permissões inválidas para rotação da chave",
            422
          );
        }

        const revogada = await tx.chaveApi.updateMany({
          where: {
            id: antiga.id,
            ativa: true,
          },
          data: {
            ativa: false,
            revogadoEm: new Date(),
          },
        });

        if (!revogada.count) {
          throw new ErroDominio(
            "A chave já foi revogada",
            409
          );
        }

        const nova = await tx.chaveApi.create({
          data: {
            organizacaoId: antiga.organizacaoId,
            nome: antiga.nome,
            prefixo,
            hashChave: hash(secret),
            permissoes: permissoes as Prisma.InputJsonValue,
            expiraEm: antiga.expiraEm,
          },
          select: publico,
        });

        return nova;
      });

      return reply.code(201).send({
        chave: atualizado,
        segredo: secret,
      });
    }
  );
}
