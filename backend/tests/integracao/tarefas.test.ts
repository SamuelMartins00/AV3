import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { filaTarefas } from "../../src/modules/tarefas/tarefas.queue.js";
import { workerTarefas } from "../../src/modules/tarefas/tarefas.worker.js";

let app: FastifyInstance;
let token = "";

async function requisicao(method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: unknown, headers: Record<string, string> = {}) {
  return app.inject({
    method,
    url: `/api/v1${url}`,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    payload: payload as object | undefined,
  });
}

async function aguardarEstado(id: string, estado: "CONCLUIDA" | "FALHOU") {
  const limite = Date.now() + 25_000;
  while (Date.now() < limite) {
    const tarefa = await prisma.tarefaAssincrona.findUnique({ where: { id } });
    if (tarefa?.status === estado) return tarefa;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Tarefa ${id} não alcançou ${estado}`);
}

beforeAll(async () => {
  const banco = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
  if (!banco.endsWith("_test")) throw new Error("Teste recusado: DATABASE_URL deve terminar em _test.");
  const redis = new URL(process.env.REDIS_URL ?? "");
  if (redis.pathname === "/0") throw new Error("Teste recusado: Redis de integração não pode usar /0.");

  await workerTarefas.waitUntilReady();
  await filaTarefas.obliterate({ force: true });
  await prisma.tarefaAssincrona.deleteMany();
  await prisma.usuario.deleteMany({ where: { usuario: "worker-test-admin" } });
  await prisma.usuario.create({
    data: {
      usuario: "worker-test-admin",
      nomeExibicao: "Admin de Teste",
      hashSenha: await bcrypt.hash("Admin@12345", 4),
      papel: "ADMINISTRADOR",
    },
  });
  app = buildApp();
  await app.ready();
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { usuario: "worker-test-admin", senha: "Admin@12345" },
  });
  if (login.statusCode !== 200) throw new Error(`Falha no login de teste: ${login.body}`);
  token = login.json().accessToken;
});

afterAll(async () => {
  await app?.close();
  await workerTarefas.close();
  await filaTarefas.close();
  await prisma.tarefaAssincrona.deleteMany();
  await prisma.usuario.deleteMany({ where: { usuario: "worker-test-admin" } });
  await prisma.$disconnect();
});

describe("tarefas assíncronas com MySQL e Redis de teste", () => {
  it("exige autenticação para criar e consultar tarefas", async () => {
    token = "";
    const semToken = await requisicao("POST", "/tarefas", { tipo: "ANALISE_EFICIENCIA" });
    expect(semToken.statusCode).toBe(401);
    token = "invalid";
    const tokenInvalido = await requisicao("GET", "/tarefas/00000000-0000-4000-8000-000000000001");
    expect(tokenInvalido.statusCode).toBe(401);
    token = "";
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { usuario: "worker-test-admin", senha: "Admin@12345" } });
    token = login.json().accessToken;
  });

  it("cria, aplica idempotência, processa, permite polling e download", async () => {
    const payload = {
      tipo: "GERACAO_RELATORIO",
      parametros: { relatorio: "STATUS", status: "AGUARDANDO_TRIAGEM" },
    };
    const headers = { "idempotency-key": "relatorio-status-001" };
    const primeira = await requisicao("POST", "/tarefas", payload, headers);
    const repetida = await requisicao("POST", "/tarefas", payload, headers);
    expect(primeira.statusCode).toBe(202);
    expect(repetida.statusCode).toBe(202);
    expect(primeira.json().id).toBe(repetida.json().id);

    const concluida = await aguardarEstado(primeira.json().id, "CONCLUIDA");
    expect(concluida.resultado).not.toBeNull();
    expect(concluida.duracaoMs).toEqual(expect.any(Number));
    const polling = await requisicao("GET", `/tarefas/${concluida.id}`);
    expect(polling.statusCode).toBe(200);
    expect(polling.json().status).toBe("CONCLUIDA");
    expect(polling.json().resultadoDisponivel).toBe(true);
    const download = await requisicao("GET", `/tarefas/${concluida.id}/download`);
    expect(download.statusCode).toBe(200);
    expect(download.headers["content-type"]).toContain("application/json");
  });

  it("registra falha terminal depois das tentativas limitadas", async () => {
    const criada = await requisicao("POST", "/tarefas", {
      tipo: "GERACAO_RELATORIO",
      parametros: { relatorio: "FINANCEIRO", inicio: "data-invalida", fim: "data-invalida" },
    });
    expect(criada.statusCode).toBe(202);
    const falhou = await aguardarEstado(criada.json().id, "FALHOU");
    expect(falhou.tentativas).toBe(3);
    expect(falhou.erro).toBeTruthy();
    expect(falhou.duracaoMs).toEqual(expect.any(Number));
  });

  it("publica um documento OpenAPI válido com as rotas CRUD de tarefas", async () => {
    const resposta = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(resposta.statusCode).toBe(200);
    const documento = resposta.json();
    expect(documento.openapi).toMatch(/^3\.0\./);
    expect(documento.paths["/api/v1/tarefas"]).toBeTruthy();
    expect(documento.paths["/api/v1/tarefas/{id}"]).toBeTruthy();
    expect(documento.paths["/api/v1/tarefas/{id}"].patch).toBeTruthy();
    expect(documento.paths["/api/v1/tarefas/{id}"].delete).toBeTruthy();
  });

  it("lista, cancela e exclui uma tarefa por meio do CRUD protegido", async () => {
    await workerTarefas.pause();
    try {
      const criada = await requisicao("POST", "/tarefas", {
        tipo: "GERACAO_RELATORIO",
        parametros: { relatorio: "STATUS", status: "AGUARDANDO_TRIAGEM" },
      });
      expect(criada.statusCode).toBe(202);
      const id = criada.json().id as string;

      const lista = await requisicao("GET", "/tarefas?status=PENDENTE&pagina=1&limite=10");
      expect(lista.statusCode).toBe(200);
      expect(lista.json().dados.some((item: { id: string }) => item.id === id)).toBe(true);

      const parametrosAtualizados = await requisicao("PATCH", `/tarefas/${id}`, {
        parametros: { relatorio: "STATUS", status: "EM_TRIAGEM" },
      });
      expect(parametrosAtualizados.statusCode).toBe(200);
      const persistida = await prisma.tarefaAssincrona.findUnique({ where: { id } });
      expect(persistida?.parametros).toMatchObject({
        relatorio: "STATUS",
        status: "EM_TRIAGEM",
      });

      const atualizada = await requisicao("PATCH", `/tarefas/${id}`, { acao: "CANCELAR" });
      expect(atualizada.statusCode).toBe(200);
      expect(atualizada.json()).toMatchObject({ id, status: "CANCELADA" });

      const consulta = await requisicao("GET", `/tarefas/${id}`);
      expect(consulta.statusCode).toBe(200);
      expect(consulta.json().status).toBe("CANCELADA");

      const excluida = await requisicao("DELETE", `/tarefas/${id}`);
      expect(excluida.statusCode).toBe(204);

      const ausente = await requisicao("GET", `/tarefas/${id}`);
      expect(ausente.statusCode).toBe(404);
    } finally {
      await workerTarefas.resume();
    }
  });


});
