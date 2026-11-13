import { api } from '../../lib/api';
import type { CriarLote, FiltrosLotes, Lote, LoteResumo, DadosEquipamentoLote } from './types';
const base = '/lotes';
export const lotesApi = {
  listar: async (filtros: FiltrosLotes) => (await api.get<LoteResumo[]>(base, { params: filtros })).data,
  buscar: async (id: number) => (await api.get<Lote>(`${base}/${id}`)).data,
  criar: async (dados: CriarLote) => (await api.post<Lote>(base, dados)).data,
  adicionarEquipamentos: async (id: number, equipamentos: DadosEquipamentoLote[]) => (await api.post<Lote>(`${base}/${id}/equipamentos`, { equipamentos })).data,
  concluirTriagem: async (id: number, versao: number) => (await api.post<Lote>(`${base}/${id}/triagem`, { versao })).data,
  excluir: async (id: number) => api.delete(`${base}/${id}`),
};
