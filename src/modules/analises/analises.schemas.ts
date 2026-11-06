import { paramsIdSchema } from "../compartilhado/params.js";

export type TipoAnalise = "EFICIENCIA_OPERACIONAL" | "RENTABILIDADE_EQUIPAMENTOS" | "VIDA_UTIL_REMANESCENTE";
export interface ExecutarAnaliseBody {
  organizacaoId?: number;
  inicio?: string;
  fim?: string;
  limiteAmostra?: number;
}
export interface ConsultarAnalisesQuery {
  tipo?: TipoAnalise;
  organizacaoId?: number;
  inicio?: string;
  fim?: string;
  pagina?: number;
  limite?: number;
}
const periodo = {
  inicio: { type: "string", minLength: 10, maxLength: 40 },
  fim: { type: "string", minLength: 10, maxLength: 40 },
};
const body = {
  type: "object", additionalProperties: false,
  properties: {
    organizacaoId: { type: "integer", minimum: 1 }, ...periodo,
    limiteAmostra: { type: "integer", minimum: 3, maximum: 10000 },
  },
} as const;
export const executarAnaliseSchema = { body } as const;
export const consultarAnalisesSchema = {
  querystring: { type: "object", additionalProperties: false, properties: {
    tipo: { type: "string", enum: ["EFICIENCIA_OPERACIONAL", "RENTABILIDADE_EQUIPAMENTOS", "VIDA_UTIL_REMANESCENTE"] },
    organizacaoId: { type: "integer", minimum: 1 }, ...periodo,
    pagina: { type: "integer", minimum: 1, maximum: 10000 },
    limite: { type: "integer", minimum: 1, maximum: 100 },
  } },
} as const;
export const resultadoAnaliseSchema = { params: paramsIdSchema } as const;
