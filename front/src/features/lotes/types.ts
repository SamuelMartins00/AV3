import type { EstadoFisico, TipoEquipamento } from '../equipamentos/types';

export type StatusLote = 'RECEBIDO' | 'EM_TRIAGEM' | 'TRIAGEM_CONCLUIDA' | 'ENCAMINHADO' | 'FINALIZADO';
export interface DadosEquipamentoLote { tipo: TipoEquipamento; marca: string; modelo: string; anoFabricacao: number; estadoFisico: EstadoFisico; pesoQuilogramas: number }
export interface LoteResumo { id: number; organizacaoId: number; dataEntrada: string; notaFiscal: string; transportadora: string; statusProcessamento: StatusLote; observacoes: string | null; triagemConcluidaEm: string | null; versao: number; quantidadeEquipamentos: number; pesoTotalKg: number }
export interface Lote extends LoteResumo { equipamentos: import('../equipamentos/types').Equipamento[] }
export interface FiltrosLotes { inicio?: string; fim?: string; organizacaoId?: number; statusProcessamento?: StatusLote; notaFiscal?: string }
export interface CriarLote { dataEntrada: string; organizacaoId: number; notaFiscal: string; transportadora: string; observacoes?: string; equipamentos?: DadosEquipamentoLote[] }
