import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { filaTarefas } from "./modules/tarefas/tarefas.queue.js";

const app = buildApp();
let encerrando = false;

async function encerrar(sinal: string): Promise<void> {
  if (encerrando) return;
  encerrando = true;

  app.log.info(`Sinal ${sinal} recebido, encerrando o servidor...`);
  try {
    await app.close();
    await filaTarefas.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (erro) {
    app.log.error(erro);
    process.exit(1);
  }
}

process.on("SIGINT", () => void encerrar("SIGINT"));
process.on("SIGTERM", () => void encerrar("SIGTERM"));

async function verificarBanco(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (erro) {
    app.log.error(erro);
    app.log.error(
      "Não foi possível conectar ao banco de dados. Verifique: (1) o MySQL está em execução; " +
        "(2) DATABASE_URL (host, porta, usuário, senha e nome do banco); (3) as migrações foram " +
        "aplicadas (npx prisma migrate deploy); (4) em MySQL 8 com host remoto e sem TLS, defina " +
        "DB_ALLOW_PUBLIC_KEY_RETRIEVAL=true.",
    );
    throw erro;
  }
}

try {
  await verificarBanco();
  await app.listen({ port: env.port, host: env.host });
  const hostSwagger = env.host === "0.0.0.0" || env.host === "::" ? "127.0.0.1" : env.host;
  app.log.info(`Swagger disponível em: http://${hostSwagger}:${env.port}/docs`);
} catch (erro) {
  app.log.error(erro);
  await prisma.$disconnect();
  process.exit(1);
}