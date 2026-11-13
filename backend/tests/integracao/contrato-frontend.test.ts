import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";

// Contratos adicionados para o front-end: flag de troca de senha no login,
// códigos de erro estáveis, opções de organização para todos os papéis,
// GET de equipamento, listagem de avaliações e triagemConcluidaEm no lote.

type Resposta = { status: number; corpo: any };

let app: FastifyInstance;
const token: Record<string, string> = {};
const SENHAS = { admin: "Admin@12345", operador: "Operador@12345", gestor: "Gestor@12345", auditor: "Auditor@12345" } as const;
const dataISO = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

async function chamar(metodo: "GET" | "POST" | "PUT", url: string, quem?: string, corpo?: unknown): Promise<Resposta> {
  const r = await app.inject({
    method: metodo,
    url: `/api/v1${url}`,
    headers: quem ? { authorization: `Bearer ${token[quem]}` } : {},
    payload: corpo as object | undefined,
  });
  return { status: r.statusCode, corpo: r.body ? JSON.parse(r.body) : null };
}

beforeAll(async () => {
  const banco = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
  if (!banco.endsWith("_test")) throw new Error(`Recusado: "${banco}" não é um banco de testes (deve terminar em _test).`);

  await prisma.journalTransacao.deleteMany();
  await prisma.avaliacaoRecuperacao.deleteMany();
  await prisma.movimentacao.deleteMany();
  await prisma.equipamento.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.organizacao.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.configuracaoGlobal.deleteMany();

  const hash = (s: string) => bcrypt.hash(s, 4);
  await prisma.usuario.createMany({
    data: [
      { usuario: "admin", nomeExibicao: "Administrador", hashSenha: await hash(SENHAS.admin), papel: "ADMINISTRADOR" },
      { usuario: "operador", nomeExibicao: "Operador", hashSenha: await hash(SENHAS.operador), papel: "OPERADOR_CADASTRO" },
      { usuario: "gestor", nomeExibicao: "Gestor", hashSenha: await hash(SENHAS.gestor), papel: "GESTOR_ALMOXARIFADO" },
      { usuario: "auditor", nomeExibicao: "Auditor", hashSenha: await hash(SENHAS.auditor), papel: "AUDITOR" },
    ],
  });
  await prisma.configuracaoGlobal.create({ data: { id: 1 } });

  app = buildApp({ logger: false });
  await app.ready();

  for (const quem of Object.keys(SENHAS) as (keyof typeof SENHAS)[]) {
    const r = await chamar("POST", "/auth/login", undefined, { usuario: quem, senha: SENHAS[quem] });
    token[quem] = r.corpo.accessToken;
  }
});

afterAll(async () => {
  await app?.close();
  await prisma.$disconnect();
});

describe("Contratos para o front-end", () => {
  let organizacaoId = 0;
  let loteId = 0;
  let equipamentoId = 0;

  it("login informa senhaAlteracaoObrigatoria e erros trazem codigo estável", async () => {
    const ok = await chamar("POST", "/auth/login", undefined, { usuario: "gestor", senha: SENHAS.gestor });
    expect(ok.status).toBe(200);
    expect(ok.corpo.senhaAlteracaoObrigatoria).toBe(false);

    const errada = await chamar("POST", "/auth/login", undefined, { usuario: "gestor", senha: "errada" });
    expect(errada.status).toBe(401);
    expect(errada.corpo.codigo).toBe("CREDENCIAIS_INVALIDAS");

    expect((await chamar("GET", "/lotes")).corpo.codigo).toBe("TOKEN_INVALIDO");
    const semPermissao = await chamar("GET", "/lotes", "operador");
    expect(semPermissao.status).toBe(403);
    expect(semPermissao.corpo.codigo).toBe("SEM_PERMISSAO");
  });

  it("após redefinição administrativa, o login sinaliza a troca e as rotas respondem 403 com codigo", async () => {
    const auditor = await prisma.usuario.findUniqueOrThrow({ where: { usuario: "auditor" } });
    expect((await chamar("PUT", `/usuarios/${auditor.id}/senha`, "admin", { senhaNova: "Temporaria@123" })).status).toBe(204);

    const login = await chamar("POST", "/auth/login", undefined, { usuario: "auditor", senha: "Temporaria@123" });
    expect(login.status).toBe(200);
    expect(login.corpo.senhaAlteracaoObrigatoria).toBe(true);
    token.auditor = login.corpo.accessToken;

    const bloqueada = await chamar("GET", "/auth/me", "auditor");
    expect(bloqueada.status).toBe(403);
    expect(bloqueada.corpo.codigo).toBe("SENHA_ALTERACAO_OBRIGATORIA");

    expect((await chamar("POST", "/auth/alterar-senha", "auditor", { senhaAtual: "Temporaria@123", senhaNova: "Auditor@12345" })).status).toBe(204);
    const novo = await chamar("POST", "/auth/login", undefined, { usuario: "auditor", senha: "Auditor@12345" });
    expect(novo.corpo.senhaAlteracaoObrigatoria).toBe(false);
    token.auditor = novo.corpo.accessToken;
  });

  it("opções de organização ficam disponíveis a todos os papéis, só com id/razão social/situação", async () => {
    const criada = await chamar("POST", "/organizacoes", "operador", {
      razaoSocial: "Banco Exemplo S.A.",
      cnpj: "11.222.333/0001-81",
      enderecoCompleto: "Av. Paulista, 1000, São Paulo",
      contrato: { dataVencimento: dataISO(365), valorMensal: 1500.5 },
    });
    expect(criada.status).toBe(201);
    organizacaoId = criada.corpo.id;

    for (const quem of ["admin", "operador", "gestor", "auditor"]) {
      const r = await chamar("GET", "/organizacoes/opcoes", quem);
      expect(r.status).toBe(200);
      expect(r.corpo).toContainEqual({ id: organizacaoId, razaoSocial: "Banco Exemplo S.A.", ativo: true });
      expect(Object.keys(r.corpo[0]).sort()).toEqual(["ativo", "id", "razaoSocial"]);
    }
    expect((await chamar("GET", "/organizacoes/opcoes")).status).toBe(401);
    // A listagem completa continua restrita
    expect((await chamar("GET", "/organizacoes", "gestor")).status).toBe(403);
    expect((await chamar("GET", "/organizacoes", "auditor")).status).toBe(403);
  });

  it("lote expõe triagemConcluidaEm (nulo até concluir a triagem)", async () => {
    const r = await chamar("POST", "/lotes", "gestor", {
      dataEntrada: dataISO(-1),
      organizacaoId,
      notaFiscal: "NF-2001",
      transportadora: "TransRápida",
      equipamentos: [{ tipo: "NOTEBOOK", marca: "Dell", modelo: "Latitude", anoFabricacao: 2021, estadoFisico: "BOM_ESTADO", pesoQuilogramas: 2.1 }],
    });
    expect(r.status).toBe(201);
    expect(r.corpo).toHaveProperty("triagemConcluidaEm", null);
    loteId = r.corpo.id;
    equipamentoId = r.corpo.equipamentos[0].id;

    const lista = await chamar("GET", "/lotes", "gestor");
    expect(lista.corpo.find((l: any) => l.id === loteId)).toHaveProperty("triagemConcluidaEm", null);
  });

  it("GET /equipamentos/:id e GET /equipamentos/:id/avaliacoes-recuperacao respeitam papéis", async () => {
    for (const quem of ["admin", "gestor", "auditor"]) {
      const eq = await chamar("GET", `/equipamentos/${equipamentoId}`, quem);
      expect(eq.status).toBe(200);
      expect(eq.corpo).toMatchObject({ id: equipamentoId, loteId, versao: 1 });
      const av = await chamar("GET", `/equipamentos/${equipamentoId}/avaliacoes-recuperacao`, quem);
      expect(av.status).toBe(200);
      expect(av.corpo).toEqual([]);
    }
    expect((await chamar("GET", `/equipamentos/${equipamentoId}`, "operador")).status).toBe(403);
    expect((await chamar("GET", "/equipamentos/2147483647", "gestor")).status).toBe(404);
    expect((await chamar("GET", "/equipamentos/2147483647/avaliacoes-recuperacao", "gestor")).status).toBe(404);
  });

  it("lista as avaliações de recuperação, da mais recente para a mais antiga", async () => {
    const triagem = await chamar("POST", `/equipamentos/${equipamentoId}/triagem`, "gestor", {
      versao: 1,
      resultadoTriagem: "APROVADO_PARA_DESMONTAGEM",
      justificativa: "Pronto para desmontagem",
    });
    expect(triagem.status).toBe(200);
    for (const material of ["Cobre", "Alumínio"]) {
      const r = await chamar("POST", `/equipamentos/${equipamentoId}/avaliacoes-recuperacao`, "gestor", { material, valorEstimado: 10 });
      expect(r.status).toBe(201);
    }
    const lista = await chamar("GET", `/equipamentos/${equipamentoId}/avaliacoes-recuperacao`, "auditor");
    expect(lista.status).toBe(200);
    expect(lista.corpo.map((a: any) => a.material)).toEqual(["Alumínio", "Cobre"]);
    expect(lista.corpo[0]).toMatchObject({ equipamentoId, valorRealizado: null, realizadoEm: null });
  });
});
