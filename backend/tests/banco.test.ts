import { describe, expect, it } from "vitest";
import { montarOpcoesBanco } from "../src/config/banco.js";

describe("montarOpcoesBanco", () => {
  it("extrai host, porta, usuário, senha e banco da URL", () => {
    const o = montarOpcoesBanco("mysql://app:p%40ss@db.interno:3307/logistica_db");
    expect(o).toMatchObject({ host: "db.interno", port: 3307, user: "app", password: "p@ss", database: "logistica_db" });
  });

  it("usa a porta 3306 por padrão", () => {
    expect(montarOpcoesBanco("mysql://u:p@localhost/x").port).toBe(3306);
  });

  it.each(["localhost", "127.0.0.1"])("habilita a recuperação da chave RSA em host local (%s)", (host) => {
    expect(montarOpcoesBanco(`mysql://u:p@${host}:3306/x`).allowPublicKeyRetrieval).toBe(true);
  });

  it("mantém desabilitada em host remoto por padrão", () => {
    expect(montarOpcoesBanco("mysql://u:p@db.exemplo.com:3306/x").allowPublicKeyRetrieval).toBe(false);
  });

  it("respeita a configuração explícita nos dois sentidos", () => {
    expect(montarOpcoesBanco("mysql://u:p@db.exemplo.com/x", true).allowPublicKeyRetrieval).toBe(true);
    expect(montarOpcoesBanco("mysql://u:p@localhost/x", false).allowPublicKeyRetrieval).toBe(false);
  });
});
