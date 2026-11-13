export type TipoAnalise = 'EFICIENCIA_OPERACIONAL' | 'RENTABILIDADE_EQUIPAMENTOS' | 'VIDA_UTIL_REMANESCENTE';
export interface PeriodoAnalise { inicio?: string; fim?: string }
export interface ExecutarAnalise { organizacaoId?: number; inicio?: string; fim?: string; limiteAmostra?: number }
export interface ResultadoAnalise { id: number; organizacaoId: number | null; tipo: TipoAnalise; titulo: string; descricao: string | null; dados: Record<string, unknown>; parametros: Record<string, unknown> | null; periodo: { inicio: string | null; fim: string | null }; geradoEm: string; versaoModelo: string | null }
export interface AnalisesResponse { pagina: number; limite: number; total: number; resultados: ResultadoAnalise[] }
export interface FiltrosAnalises { tipo?: TipoAnalise; organizacaoId?: number; inicio?: string; fim?: string; pagina?: number; limite?: number }
