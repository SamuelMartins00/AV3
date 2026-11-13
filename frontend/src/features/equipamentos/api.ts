import { api } from '../../lib/api';
import type { AvaliacaoRecuperacao, Depreciacao, Equipamento, FiltrosEquipamentos, HistoricoEquipamento, EstadoFisico, ResultadoTriagem, StatusRastreamento } from './types';
const base = '/equipamentos';
export const equipamentosApi = {
  listar: async (filtros: FiltrosEquipamentos) => (await api.get<Equipamento[]>(base, { params: filtros })).data,
  buscar: async (id: number) => (await api.get<Equipamento>(`${base}/${id}`)).data,
  historico: async (id: number) => (await api.get<HistoricoEquipamento>(`${base}/${id}/historico`)).data,
  avaliacoes: async (id: number) => (await api.get<AvaliacaoRecuperacao[]>(`${base}/${id}/avaliacoes-recuperacao`)).data,
  depreciacao: async (id: number) => (await api.get<Depreciacao>(`${base}/${id}/depreciacao`)).data,
  triagem: async (id: number, body: { versao: number; resultadoTriagem: Exclude<ResultadoTriagem, 'AGUARDANDO_AVALIACAO'>; justificativa: string }) => (await api.post<Equipamento>(`${base}/${id}/triagem`, body)).data,
  avaliarRecuperacao: async (id: number, body: { material: string; valorEstimado: number; observacao?: string }) => (await api.post<AvaliacaoRecuperacao>(`${base}/${id}/avaliacoes-recuperacao`, body)).data,
  movimentar: async (id: number, body: { destino: string; observacao?: string }) => (await api.post(`${base}/${id}/movimentacoes`, body)).data,
  atualizarEstado: async (id: number, body: { versao: number; novoEstado: EstadoFisico; justificativa?: string }) => (await api.patch<Equipamento>(`${base}/${id}/estado-fisico`, body)).data,
  atualizarStatus: async (id: number, body: { versao: number; novoStatus: StatusRastreamento; justificativa: string }) => (await api.patch<Equipamento>(`${base}/${id}/status`, body)).data,
  baixaDefinitiva: async (id: number, body: { versao: number; justificativa: string }) => (await api.post<Equipamento>(`${base}/${id}/baixa-definitiva`, body)).data,
  excluir: async (id: number) => api.delete(`${base}/${id}`),
};
