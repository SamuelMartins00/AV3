import { beforeEach, describe, expect, it, vi } from "vitest";

const { criar } = vi.hoisted(() => ({ criar: vi.fn() }));

vi.mock("../src/config/env.js", () => ({
  env: {
    redisPrefix: "greencode",
    taskMaxAttempts: 3,
    taskBackoffMs: 50,
    analyticsScheduleEnabled: false,
    analyticsScheduleCron: "0 2 * * *",
    analyticsScheduleTimezone: "America/Sao_Paulo",
  },
}));
vi.mock("../src/infra/redis.js", () => ({ redisConnection: {} }));
vi.mock("../src/modules/tarefas/tarefas.producer.js", () => ({
  tarefasProducer: { criar },
}));
vi.mock("bullmq", () => ({
  Queue: class Queue {
    constructor() {}
  },
  Worker: class Worker {
    constructor() {}
  },
}));

import {
  ID_AGENDADOR_ANALISES,
  executarOcorrenciaAgendada,
  registrarAgendaAnalises,
} from "../src/modules/analises/analises.scheduler.js";

describe("agendamento recorrente de análises", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    criar.mockResolvedValue({ id: "tarefa-123", status: "PENDENTE" });
  });

  it("não registra agenda quando desabilitada", async () => {
    const upsertJobScheduler = vi.fn();
    const registrada = await registrarAgendaAnalises(
      { upsertJobScheduler } as never,
      { enabled: false, cron: "*/5 * * * *", timezone: "America/Sao_Paulo" },
    );
    expect(registrada).toBe(false);
    expect(upsertJobScheduler).not.toHaveBeenCalled();
  });

  it("registra a agenda com ID estável, cron e fuso explícito", async () => {
    const upsertJobScheduler = vi.fn().mockResolvedValue(undefined);
    const registrada = await registrarAgendaAnalises(
      { upsertJobScheduler } as never,
      { enabled: true, cron: "15 3 * * *", timezone: "America/Sao_Paulo" },
    );
    expect(registrada).toBe(true);
    expect(upsertJobScheduler).toHaveBeenCalledWith(
      ID_AGENDADOR_ANALISES,
      { pattern: "15 3 * * *", tz: "America/Sao_Paulo" },
      expect.objectContaining({
        name: "executar-analises-agendadas",
        data: { scheduleId: ID_AGENDADOR_ANALISES },
      }),
    );
  });

  it("despacha uma análise completa com chave idempotente derivada do job", async () => {
    const resultado = await executarOcorrenciaAgendada(
      { id: "repeat:agenda:1700000000000", data: { scheduleId: ID_AGENDADOR_ANALISES } } as never,
      criar,
    );
    expect(criar).toHaveBeenCalledWith(expect.objectContaining({
      tipo: "ANALISE_COMPLETA",
      escopoIdempotencia: `agenda:${ID_AGENDADOR_ANALISES}`,
      chaveIdempotencia: "repeat:agenda:1700000000000",
    }));
    expect(resultado).toEqual({ tarefaId: "tarefa-123", status: "PENDENTE" });
  });

  it("propaga falha do despacho para permitir retry do BullMQ", async () => {
    criar.mockRejectedValueOnce(new Error("MySQL indisponível"));
    await expect(executarOcorrenciaAgendada(
      { id: "repeat:agenda:1700000000001", data: { scheduleId: ID_AGENDADOR_ANALISES } } as never,
      criar,
    )).rejects.toThrow("MySQL indisponível");
  });
});
