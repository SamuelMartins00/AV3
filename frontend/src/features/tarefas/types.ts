export type StatusTarefa = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDA' | 'FALHOU' | 'CANCELADA';
export type TipoTarefa = 'GERACAO_RELATORIO' | 'ANALISE_EFICIENCIA' | 'ANALISE_RENTABILIDADE' | 'ANALISE_VIDA_UTIL' | 'ANALISE_COMPLETA';
export interface TarefaResumo { id: string; tipo: TipoTarefa; status: StatusTarefa; organizacaoId: number | null; tentativas: number; maxTentativas: number; erro: string | null; criadoEm: string; iniciadaEm: string | null; concluidaEm: string | null; resultadoExpiraEm: string | null }
export interface TarefaDetalhe extends TarefaResumo { resultadoDisponivel: boolean; downloadUrl: string | null; resultado: unknown; formatoArquivo?: string | null }
export interface TarefasResponse { dados: TarefaResumo[]; pagina: number; limite: number; total: number; totalPaginas: number }
export interface FiltrosTarefas { tipo?: TipoTarefa; status?: StatusTarefa; pagina?: number; limite?: number }
export interface CriarTarefa { tipo: TipoTarefa; organizacaoId?: number; parametros?: Record<string, unknown> }
