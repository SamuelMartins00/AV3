import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import authRoutes from "./modules/auth/auth.routes.js";
import analisesRoutes from "./modules/analises/analises.routes.js";
import auditoriaRoutes from "./modules/auditoria/auditoria.routes.js";
import configuracaoRoutes from "./modules/configuracao/configuracao.routes.js";
import equipamentosRoutes from "./modules/equipamentos/equipamentos.routes.js";
import lotesRoutes from "./modules/lotes/lotes.routes.js";
import organizacoesRoutes from "./modules/organizacoes/organizacoes.routes.js";
import organizacoesOpcoesRoutes from "./modules/organizacoes/organizacoes.opcoes.routes.js";
import relatoriosRoutes from "./modules/relatorios/relatorios.routes.js";
import usuariosRoutes from "./modules/usuarios/usuarios.routes.js";
import chavesApiRoutes from "./modules/chaves-api/chaves-api.routes.js";
import publicaRoutes from "./modules/publica/publica.routes.js";
import tarefasRoutes from "./modules/tarefas/tarefas.routes.js";
import authPlugin from "./plugins/auth.js";
import swaggerPlugin from "./plugins/swagger.js";

export function buildApp(opcoes: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opcoes.logger === false ? false : { redact: ["req.headers.x-api-key"] } });

  app.setErrorHandler((erro: FastifyError, request, reply) => {
    const status =
      erro.statusCode && erro.statusCode >= 400 ? erro.statusCode : 500;

    if (status >= 500) {
      request.log.error(erro);
    }

    const codigo = (erro as { codigo?: unknown }).codigo;
    reply.status(status).send({
      erro: status >= 500 ? "Erro interno do servidor" : erro.message,
      ...(status < 500 && typeof codigo === "string" ? { codigo } : {}),
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ erro: "Rota não encontrada" });
  });

  // CORS é opcional: só é habilitado quando CORS_ORIGINS está definida (lista
  // de origens separadas por vírgula). Em desenvolvimento, prefira o proxy do Vite.
  if (env.corsOrigins.length > 0) {
    app.register(cors, {
      origin: env.corsOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
      exposedHeaders: ["Content-Disposition"],
      credentials: false,
      maxAge: 600,
    });
  }

  // A ordem importa: autenticação e Swagger devem vir antes das rotas
  app.register(authPlugin);
  app.register(swaggerPlugin);
  app.register(authRoutes, { prefix: "/api/v1/auth" });
  app.register(chavesApiRoutes, { prefix: "/api/v1/chaves-api" });
  app.register(publicaRoutes, { prefix: "/api/v1/public" });
  app.register(tarefasRoutes, { prefix: "/api/v1/tarefas" });
  app.register(auditoriaRoutes, { prefix: "/api/v1/auditoria" });
  app.register(organizacoesOpcoesRoutes, { prefix: "/api/v1/organizacoes" });
  app.register(organizacoesRoutes, { prefix: "/api/v1/organizacoes" });
  app.register(lotesRoutes, { prefix: "/api/v1/lotes" });
  app.register(equipamentosRoutes, { prefix: "/api/v1/equipamentos" });
  app.register(relatoriosRoutes, { prefix: "/api/v1/relatorios" });
  app.register(analisesRoutes, { prefix: "/api/v1/analises" });
  app.register(configuracaoRoutes, { prefix: "/api/v1/configuracao" });
  app.register(usuariosRoutes, { prefix: "/api/v1/usuarios" });

  // Registrada como plugin para que o Swagger a enxergue (ele só lê rotas criadas depois do seu próprio registro)
  app.register(async (instancia) => {
    instancia.get("/api/v1/saude", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok" };
    });
  });

  return app;
}
