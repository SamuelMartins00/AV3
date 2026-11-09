import fastifyJwt from "@fastify/jwt";
import { createHash } from "node:crypto";
import fp from "fastify-plugin";
import type { FastifyRequest } from "fastify";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ErroDominio } from "../dominio/erros.js";
import type { Papel } from "../dominio/papel.js";

export default fp(async (app) => {
  await app.register(fastifyJwt, { secret: env.jwtSecret, sign: { expiresIn: env.jwtAccessExpira } });

  app.decorate("autenticar", async (request: FastifyRequest) => {
    try { await request.jwtVerify(); }
    catch { throw new ErroDominio("Token ausente, inválido ou expirado", 401); }

    const id = Number(request.user.sub);
    if (!Number.isSafeInteger(id) || id <= 0) throw new ErroDominio("Token inválido", 401);
    const atual = await prisma.usuario.findUnique({ where: { id }, select: { id: true, usuario: true, papel: true, ativo: true, nomeExibicao: true, senhaAlteracaoObrigatoria: true, versaoSeguranca: true } });
    if (!atual || !atual.ativo || request.user.versaoSeguranca !== atual.versaoSeguranca) {
      throw new ErroDominio("Sessão inválida ou revogada", 401);
    }

    // Nunca confiar no papel ou login desatualizados do JWT.
    request.user.usuario = atual.usuario;
    request.user.papel = atual.papel as Papel;
    request.user.nomeExibicao = atual.nomeExibicao;

    if (atual.senhaAlteracaoObrigatoria && !request.url.split("?")[0]?.endsWith("/auth/alterar-senha")) {
      throw new ErroDominio("É obrigatório alterar a senha antes de continuar", 403);
    }
  });

  app.decorate("autenticarApiKey", async (request: FastifyRequest) => {
    // API pública aceita exclusivamente x-api-key; JWT interno nunca é fallback.
    const raw = request.headers["x-api-key"];
    if (typeof raw !== "string" || raw.length < 30 || raw.length > 200) {
      throw new ErroDominio("API key ausente ou inválida", 401);
    }
    const hashChave = createHash("sha256").update(raw).digest("hex");
    const chave = await prisma.chaveApi.findUnique({ where: { hashChave }, select: { id: true, organizacaoId: true, permissoes: true, ativa: true, expiraEm: true, organizacao: { select: { ativo: true } } } });
    if (!chave || !chave.ativa || !chave.organizacao.ativo || (chave.expiraEm && chave.expiraEm <= new Date())) {
      throw new ErroDominio("API key inválida, revogada ou expirada", 401);
    }
    request.apiKey = { id: chave.id, organizacaoId: chave.organizacaoId, permissoes: Array.isArray(chave.permissoes) ? chave.permissoes.filter((v): v is string => typeof v === "string") : [] };
    // Não registrar o segredo nem o hash em logs/journal.
    await prisma.chaveApi.update({ where: { id: chave.id }, data: { ultimoUsoEm: new Date() } });
  });

  app.decorate("exigirPapel", (...papeis: Papel[]) => async (request: FastifyRequest) => {
    if (!papeis.includes(request.user.papel)) throw new ErroDominio("Sem permissão para esta ação", 403);
  });
});
