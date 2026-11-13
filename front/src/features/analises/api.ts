import { api } from '../../lib/api';
import type { AnalisesResponse, ExecutarAnalise, FiltrosAnalises, ResultadoAnalise } from './types';
const base = '/api/v1/analises';
export const analisesApi = {
  executar: async (tipo: 'eficiencia' | 'rentabilidade' | 'vida-util', dados: ExecutarAnalise, idempotencyKey: string) => (await api.post<{ id: string; status: string; statusUrl: string }>(`${base}/${tipo}`, dados, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
  listar: async (filtros: FiltrosAnalises) => (await api.get<AnalisesResponse>(base, { params: filtros })).data,
  buscar: async (id: number) => (await api.get<ResultadoAnalise>(`${base}/${id}`)).data,
  atualizar: async (id: number, dados: { titulo: string; descricao: string | null }) => (await api.put<ResultadoAnalise>(`${base}/${id}`, dados)).data,
  excluir: async (id: number) => api.delete(`${base}/${id}`),
};
