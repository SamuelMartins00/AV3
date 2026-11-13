import { api } from '../../lib/api';
import type { CriarTarefa, FiltrosTarefas, TarefaDetalhe, TarefasResponse } from './types';
const base = '/tarefas';
export const tarefasApi = {
  listar: async (filtros: FiltrosTarefas) => (await api.get<TarefasResponse>(base, { params: filtros })).data,
  buscar: async (id: string) => (await api.get<TarefaDetalhe>(`${base}/${id}`)).data,
  criar: async (dados: CriarTarefa, idempotencyKey?: string) => (await api.post<{ id: string; status: string; statusUrl: string }>(base, dados, { headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} })).data,
  cancelar: async (id: string) => (await api.patch<{ id: string; status: string }>(`${base}/${id}`, { acao: 'CANCELAR' })).data,
  excluir: async (id: string) => api.delete(`${base}/${id}`),
  baixar: async (id: string) => (await api.get<Blob>(`${base}/${id}/download`, { responseType: 'blob' })).data,
};
export function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = nome; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

export function mensagemErroDownload(status?: number): string {
  if (status === 409) return 'O resultado ainda não está disponível.';
  if (status === 410) return 'O resultado expirou.';
  return 'Não foi possível baixar o resultado.';
}
