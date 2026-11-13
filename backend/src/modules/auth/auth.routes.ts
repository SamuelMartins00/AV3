import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { AuthController } from "./auth.controller.js";
import {
  alterarSenhaSchema,
  loginSchema,
  refreshSchema,
  type AlterarSenhaBody,
  type LoginBody,
  type RefreshBody,
} from "./auth.schemas.js";
import { AuthService } from "./auth.service.js";

export default async function authRoutes(app: FastifyInstance) {
  const service = new AuthService((payload) => app.jwt.sign(payload));
  const controller = new AuthController(service);

  // Proteção contra força bruta. O limite do login é por IP + usuário (não
  // bloqueia outros usuários atrás do mesmo IP); o do refresh é por IP.
  await app.register(rateLimit, { global: false, hook: "preHandler" });
  const erroLimite = (_request: unknown, contexto: { statusCode: number }) => ({
    statusCode: contexto.statusCode,
    message: "Muitas tentativas. Aguarde um instante e tente novamente.",
    codigo: "LIMITE_REQUISICOES",
  });
  const limiteLogin = {
    rateLimit: {
      max: env.loginRateLimitMax,
      timeWindow: "1 minute",
      keyGenerator: (request: { ip: string; body?: unknown }) => {
        const corpo = request.body as { usuario?: unknown } | undefined;
        const usuario = typeof corpo?.usuario === "string" ? corpo.usuario.trim().toLowerCase() : "";
        return `login:${request.ip}:${usuario}`;
      },
      errorResponseBuilder: erroLimite,
    },
  };
  const limiteRefresh = {
    rateLimit: {
      max: Math.max(env.loginRateLimitMax * 6, 60),
      timeWindow: "1 minute",
      keyGenerator: (request: { ip: string }) => `refresh:${request.ip}`,
      errorResponseBuilder: erroLimite,
    },
  };

  app.post<{ Body: LoginBody }>(
    "/login",
    { schema: loginSchema, config: limiteLogin },
    controller.login,
  );

  app.post<{ Body: RefreshBody }>(
    "/refresh",
    { schema: refreshSchema, config: limiteRefresh },
    controller.renovar,
  );

  app.post<{ Body: RefreshBody }>(
    "/logout",
    { schema: refreshSchema },
    controller.logout,
  );

  app.post<{ Body: AlterarSenhaBody }>(
    "/alterar-senha",
    { schema: alterarSenhaSchema, onRequest: [app.autenticar] },
    controller.alterarSenha,
  );

  app.get("/me", { onRequest: [app.autenticar] }, controller.me);
}