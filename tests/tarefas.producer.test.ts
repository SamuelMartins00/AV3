import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, create, enfileirar } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  enfileirar: vi.fn(),
}));

vi.mock("../src/config/env.js", () => ({ env: { taskMaxAttempts: 3 } }));
vi.mock("../src/config/prisma.js", () => ({
  prisma: { tarefaAssincrona: { findUnique, create } },
}));
vi.mock("../src/modules/tarefas/tarefas.queue.js", () => ({
  enfileirarTarefa: enfileirar,
}));

import { TarefasProducer } from "../src/modules/tarefas/tarefas.producer.js";

describe("TarefasProducer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      status: "PENDENTE",
    });
    enfileirar.mockResolvedValue(undefined);
  });

  it("persiste a tarefa e a publica na fila", async () => {
    const tarefa = await new TarefasProducer().criar({
      tipo: "ANALISE_EFICIENCIA",
      parametros: { inicio: "2026-01-01" },
      escopoIdempotencia: "usuario:1",
    });
    expect(create).toHaveBeenCalledOnce();
    expect(enfileirar).toHaveBeenCalledWith(tarefa.id);
    expect(tarefa.status).toBe("PENDENTE");
  });

  it("retorna a tarefa existente quando a chave idempotente se repete", async () => {
    const existente = { id: "tarefa-existente", status: "PROCESSANDO", tipo: "ANALISE_EFICIENCIA", organizacaoId: null, parametros: {} };
    findUnique.mockResolvedValueOnce(existente);
    const tarefa = await new TarefasProducer().criar({
      tipo: "ANALISE_EFICIENCIA",
      parametros: {},
      escopoIdempotencia: "usuario:1",
      chaveIdempotencia: "requisicao-123",
    });
    expect(tarefa).toBe(existente);
    expect(create).not.toHaveBeenCalled();
    expect(enfileirar).not.toHaveBeenCalled();
  });

  it("recusa reutilização da mesma chave com payload diferente", async () => {
    findUnique.mockResolvedValueOnce({
      id: "tarefa-existente",
      status: "PROCESSANDO",
      tipo: "ANALISE_RENTABILIDADE",
      organizacaoId: null,
      parametros: {},
    });
    await expect(new TarefasProducer().criar({
      tipo: "ANALISE_EFICIENCIA",
      parametros: {},
      escopoIdempotencia: "usuario:1",
      chaveIdempotencia: "requisicao-123",
    })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("mantém tarefa pendente se Redis falhar ao publicar", async () => {
    enfileirar.mockRejectedValueOnce(new Error("Redis indisponível"));
    const tarefa = await new TarefasProducer().criar({
      tipo: "ANALISE_EFICIENCIA",
      parametros: {},
      escopoIdempotencia: "usuario:1",
    });
    expect(tarefa.status).toBe("PENDENTE");
    expect(create).toHaveBeenCalledOnce();
  });
});
