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
export interface AtualizarAnaliseBody {
  titulo: string;
  descricao: string | null;
}

const periodo = {
  inicio: { type: "string", description: "Início do período analisado (YYYY-MM-DD ou ISO 8601).", examples: ["2026-01-01T00:00:00.000Z"] },
  fim: { type: "string", description: "Fim do período analisado (YYYY-MM-DD ou ISO 8601).", examples: ["2026-12-31T23:59:59.999Z"] },
};
const body = {
  type: "object", additionalProperties: false,
  properties: {
    organizacaoId: { type: "integer", minimum: 1, description: "Restringe a análise a uma organização." },
    ...periodo,
    limiteAmostra: { type: "integer", minimum: 3, maximum: 10000, description: "Máximo de registros considerados (3 a 10000)." },
  },
} as const;

const resultadoResponse = {
  type: "object",
  properties: {
    id: { type: "integer", example: 42 },
    organizacaoId: { type: "integer", nullable: true, example: 7 },
    tipo: { type: "string", enum: ["EFICIENCIA_OPERACIONAL", "RENTABILIDADE_EQUIPAMENTOS", "VIDA_UTIL_REMANESCENTE"] },
    titulo: { type: "string", example: "Análise: EFICIENCIA_OPERACIONAL" },
    descricao: { type: "string", nullable: true },
    dados: { type: "object", additionalProperties: true, description: "Resultado estatístico calculado; preserva todas as propriedades dinâmicas do JSON armazenado." },
    parametros: { type: "object", nullable: true, additionalProperties: true, description: "Parâmetros utilizados na execução; preserva todas as propriedades dinâmicas do JSON armazenado." },
    periodo: { type: "object", properties: { inicio: { type: "string", nullable: true, format: "date-time" }, fim: { type: "string", nullable: true, format: "date-time" } } },
    geradoEm: { type: "string", format: "date-time" },
    versaoModelo: { type: "string", nullable: true },
  },
} as const;

export const executarAnaliseSchema = {
  body,
  response: { 201: resultadoResponse, 400: { description: "Parâmetros ou período inválido." }, 401: { description: "Não autenticado." }, 403: { description: "Papel sem permissão." } },
} as const;

export const consultarAnalisesSchema = {
  querystring: { type: "object", additionalProperties: false, properties: {
    tipo: { type: "string", enum: ["EFICIENCIA_OPERACIONAL", "RENTABILIDADE_EQUIPAMENTOS", "VIDA_UTIL_REMANESCENTE"], description: "Tipo de análise." },
    organizacaoId: { type: "integer", minimum: 1 },
    ...periodo,
    pagina: { type: "integer", minimum: 1, maximum: 10000, default: 1 },
    limite: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  } },
  response: { 200: { type: "object", properties: {
    pagina: { type: "integer" }, limite: { type: "integer" }, total: { type: "integer" },
    resultados: { type: "array", items: resultadoResponse },
  } } },
} as const;

export const resultadoAnaliseSchema = {
  params: paramsIdSchema,
  response: { 200: resultadoResponse, 404: { description: "Resultado analítico não encontrado." } },
} as const;

export const atualizarAnaliseSchema = {
  params: paramsIdSchema,
  body: {
    type: "object", required: ["titulo", "descricao"], additionalProperties: false,
    properties: {
      titulo: { type: "string", minLength: 3, maxLength: 160, description: "Novo título do registro." },
      descricao: { type: "string", nullable: true, maxLength: 2000, description: "Descrição editável; null remove a descrição." },
    },
  },
  response: { 200: resultadoResponse, 400: { description: "Metadados inválidos." }, 404: { description: "Resultado analítico não encontrado." } },
} as const;

export const excluirAnaliseSchema = {
  params: paramsIdSchema,
  response: { 204: { type: "null", description: "Resultado analítico excluído permanentemente." }, 404: { description: "Resultado analítico não encontrado." } },
} as const;
