import { describe, expect, it } from "vitest";
import { agruparEficienciaPorMes, calcularRegressaoLinear } from "../src/modules/analises/analises.service.js";

describe("regressão linear simples da análise de vida útil", () => {
  it("calcula inclinação e intercepto conhecidos", () => {
    const resultado = calcularRegressaoLinear([{ x: 0, y: 100 }, { x: 10, y: 80 }, { x: 20, y: 60 }]);
    expect(resultado.suficiente).toBe(true);
    if (resultado.suficiente) {
      expect(resultado.inclinacao).toBeCloseTo(-2);
      expect(resultado.intercepto).toBeCloseTo(100);
      expect(resultado.r2).toBeCloseTo(1);
    }
  });
  it("explicita amostra insuficiente", () => {
    expect(calcularRegressaoLinear([{ x: 0, y: 100 }, { x: 10, y: 80 }])).toMatchObject({ suficiente: false, motivo: "AMOSTRA_INSUFICIENTE" });
  });
  it("recusa datas sem variação", () => {
    expect(calcularRegressaoLinear([{ x: 1, y: 100 }, { x: 1, y: 90 }, { x: 1, y: 80 }])).toMatchObject({ suficiente: false, motivo: "DATAS_SEM_VARIACAO" });
  });
  it("não inventa regressão quando os valores são constantes", () => {
    const resultado = calcularRegressaoLinear([{ x: 0, y: 50 }, { x: 10, y: 50 }, { x: 20, y: 50 }]);
    expect(resultado.suficiente).toBe(true);
    if (resultado.suficiente) expect(resultado.inclinacao).toBeCloseTo(0);
  });
});

describe("série mensal da eficiência operacional", () => {
  it("agrupa pelo mês UTC de conclusão e calcula estatísticas por mês", () => {
    const lotes = [
      { dataEntrada: new Date("2026-01-01T00:00:00.000Z"), triagemConcluidaEm: new Date("2026-02-01T00:00:00.000Z") },
      { dataEntrada: new Date("2026-02-01T00:00:00.000Z"), triagemConcluidaEm: new Date("2026-02-02T00:00:00.000Z") },
      { dataEntrada: new Date("2026-02-01T00:00:00.000Z"), triagemConcluidaEm: new Date("2026-02-03T00:00:00.000Z") },
      { dataEntrada: new Date("2026-02-01T00:00:00.000Z"), triagemConcluidaEm: new Date("2026-03-01T00:00:00.000Z") },
    ];
    expect(agruparEficienciaPorMes(lotes)).toEqual([
      { mes: "2026-02", amostra: 3, mediaHoras: 272, minimoHoras: 24, maximoHoras: 744, statusAmostra: "SUFICIENTE" },
      { mes: "2026-03", amostra: 1, mediaHoras: 672, minimoHoras: 672, maximoHoras: 672, statusAmostra: "INSUFICIENTE" },
    ]);
  });

  it("ignora lotes sem conclusão ou com conclusão anterior à entrada", () => {
    expect(agruparEficienciaPorMes([
      { dataEntrada: new Date("2026-02-02T00:00:00.000Z"), triagemConcluidaEm: null },
      { dataEntrada: new Date("2026-02-02T00:00:00.000Z"), triagemConcluidaEm: new Date("2026-02-01T00:00:00.000Z") },
    ])).toEqual([]);
  });
});
