import { describe, expect, it } from "vitest";
import { calcularRegressaoLinear } from "../src/modules/analises/analises.service.js";

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
