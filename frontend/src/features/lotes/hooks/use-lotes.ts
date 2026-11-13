import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../app/toast-provider';
import { lotesApi } from '../api';
import type { CriarLote, DadosEquipamentoLote, FiltrosLotes } from '../types';
export const lotesKeys = { all: ['lotes'] as const, list: (f: FiltrosLotes) => ['lotes', 'list', f] as const, detail: (id: number) => ['lotes', 'detail', id] as const };
export function useLotes(filters: FiltrosLotes) { return useQuery({ queryKey: lotesKeys.list(filters), queryFn: () => lotesApi.listar(filters) }); }
export function useLote(id: number | null) { return useQuery({ queryKey: lotesKeys.detail(id ?? 0), queryFn: () => lotesApi.buscar(id!), enabled: id !== null }); }
export function useLoteMutations() {
  const client = useQueryClient(); const { toast } = useToast();
  const error = (e: unknown) => { const d = (e as { response?: { data?: { erro?: string; message?: string } } })?.response?.data; toast(d?.erro ?? d?.message ?? 'Não foi possível concluir a operação.', 'error'); };
  const refresh = async (id?: number) => { await client.invalidateQueries({ queryKey: lotesKeys.all }); if (id) await client.invalidateQueries({ queryKey: lotesKeys.detail(id) }); await client.invalidateQueries({ queryKey: ['equipamentos'] }); };
  const criar = useMutation({ mutationFn: (body: CriarLote) => lotesApi.criar(body), onSuccess: async () => { await refresh(); toast('Lote cadastrado com sucesso.', 'success'); }, onError: error });
  const adicionar = useMutation({ mutationFn: (v: { id: number; equipamentos: DadosEquipamentoLote[] }) => lotesApi.adicionarEquipamentos(v.id, v.equipamentos), onSuccess: async (_, v) => { await refresh(v.id); toast('Equipamentos incluídos no lote.', 'success'); }, onError: error });
  const triagem = useMutation({ mutationFn: (v: { id: number; versao: number }) => lotesApi.concluirTriagem(v.id, v.versao), onSuccess: async (_, v) => { await refresh(v.id); toast('Triagem coletiva concluída.', 'success'); }, onError: error });
  const excluir = useMutation({ mutationFn: (id: number) => lotesApi.excluir(id), onSuccess: async () => { await refresh(); toast('Lote excluído.', 'success'); }, onError: error });
  return { criar, adicionar, triagem, excluir };
}
