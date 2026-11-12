
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroDominio } from "../src/dominio/erros.js";

const ORIGINAL = { ...process.env };

async function carregarEnv(cors: string | undefined) {
  vi.resetModules();

  process.env.DATABASE_URL = "mysql://u:p@localhost:3306/x";
  process.env.JWT_SECRET = "segredo";

  // Impede que uma variável existente no ambiente ou no .env
  // interfira nos testes de CORS.
  if (cors === undefined) {
    process.env.CORS_ORIGINS = "";
  } else {
    process.env.CORS_ORIGINS = cors;
  }

  return (await import("../src/config/env.js")).env;
}

describe("CORS_ORIGINS", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.CORS_ORIGINS;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("fica desabilitado quando ausente ou vazio", async () => {
    expect((await carregarEnv(undefined)).corsOrigins).toEqual([]);
    expect((await carregarEnv("  ")).corsOrigins).toEqual([]);
  });

  it("aceita várias origens separadas por vírgula", async () => {
    const env = await carregarEnv(
      "http://localhost:5173, https://painel.exemplo.com",
    );

    expect(env.corsOrigins).toEqual([
      "http://localhost:5173",
      "https://painel.exemplo.com",
    ]);
  });

  it("recusa valores que não sejam origens", async () => {
    await expect(carregarEnv("localhost:5173")).rejects.toThrow(
      /CORS_ORIGINS/,
    );

    await expect(
      carregarEnv("http://localhost:5173/app"),
    ).rejects.toThrow(/sem caminho/);
  });
});

describe("LOGIN_RATE_LIMIT_MAX", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("usa 10 por padrão e valida inteiro positivo", async () => {
    delete process.env.LOGIN_RATE_LIMIT_MAX;

    expect((await carregarEnv(undefined)).loginRateLimitMax).toBe(10);

    process.env.LOGIN_RATE_LIMIT_MAX = "0";

    await expect(carregarEnv(undefined)).rejects.toThrow(
      /LOGIN_RATE_LIMIT_MAX/,
    );
  });
});

describe("ErroDominio", () => {
  it("carrega código opcional e mantém o padrão de status", () => {
    const erro = new ErroDominio("x", 403, "SEM_PERMISSAO");

    expect(erro.codigo).toBe("SEM_PERMISSAO");
    expect(new ErroDominio("y").statusCode).toBe(422);
    expect(new ErroDominio("y").codigo).toBeUndefined();
  });
});
