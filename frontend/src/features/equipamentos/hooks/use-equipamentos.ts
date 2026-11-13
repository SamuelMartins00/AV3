import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../app/toast-provider';
import { equipamentosApi } from '../api';
import type { FiltrosEquipamentos } from '../types';
export const equipamentosKeys = { all: ['equipamentos'] as const, list: (f: FiltrosEquipamentos) => ['equipamentos', 'list', f] as const, detail: (id: number) => ['equipamentos', 'detail', id] as const, history: (id: number) => ['equipamentos', 'history', id] as const, evaluations: (id: number) => ['equipamentos', 'evaluations', id] as const, depreciation: (id: number) => ['equipamentos', 'depreciation', id] as const };
export function useEquipamentos(filters: FiltrosEquipamentos) { return useQuery({ queryKey: equipamentosKeys.list(filters), queryFn: () => equipamentosApi.listar(filters) }); }
export function useEquipamento(id: number | null) { return useQuery({ queryKey: equipamentosKeys.detail(id ?? 0), queryFn: () => equipamentosApi.buscar(id!), enabled: id !== null }); }
export function useEquipamentoHistorico(id: number | null) { return useQuery({ queryKey: equipamentosKeys.history(id ?? 0), queryFn: () => equipamentosApi.historico(id!), enabled: id !== null }); }
export function useAvaliacoesRecuperacao(id: number | null) { return useQuery({ queryKey: equipamentosKeys.evaluations(id ?? 0), queryFn: () => equipamentosApi.avaliacoes(id!), enabled: id !== null }); }
export function useDepreciacao(id: number | null) { return useQuery({ queryKey: equipamentosKeys.depreciation(id ?? 0), queryFn: () => equipamentosApi.depreciacao(id!), enabled: id !== null }); }
export function useEquipamentoMutations() {
 const client = useQueryClient(); const { toast } = useToast();
 const refresh = async (id: number) => { await client.invalidateQueries({ queryKey: equipamentosKeys.all }); await client.invalidateQueries({ queryKey: equipamentosKeys.detail(id) }); await client.invalidateQueries({ queryKey: equipamentosKeys.history(id) }); await client.invalidateQueries({ queryKey: equipamentosKeys.evaluations(id) }); await client.invalidateQueries({ queryKey: ['lotes'] }); };
 const onError = (e: unknown) => { const d = (e as { response?: { data?: { erro?: string; message?: string } } })?.response?.data; toast(d?.erro ?? d?.message ?? 'Não foi possível concluir a operação.', 'error'); };
 const useAction = <T,>(mutationFn: (v: T) => Promise<unknown>, message: string) => useMutation({ mutationFn, onSuccess: async (_, v) => { await refresh((v as { id: number }).id); toast(message, 'success'); }, onError });
 const triagem = useAction((v: { id: number; versao: number; resultadoTriagem: Exclude<import('../types').ResultadoTriagem, 'AGUARDANDO_AVALIACAO'>; justificativa: string }) => equipamentosApi.triagem(v.id, { versao: v.versao, resultadoTriagem: v.resultadoTriagem, justificativa: v.justificativa }), 'Triagem registrada.');
 const avaliar = useAction((v: { id: number; material: string; valorEstimado: number; observacao?: string }) => equipamentosApi.avaliarRecuperacao(v.id, { material: v.material, valorEstimado: v.valorEstimado, ...(v.observacao ? { observacao: v.observacao } : {}) }), 'Avaliação de recuperação registrada.');
 const movimentar = useAction((v: { id: number; destino: string; observacao?: string }) => equipamentosApi.movimentar(v.id, { destino: v.destino, ...(v.observacao ? { observacao: v.observacao } : {}) }), 'Movimentação registrada.');
 const estado = useAction((v: { id: number; versao: number; novoEstado: import('../types').EstadoFisico; justificativa?: string }) => equipamentosApi.atualizarEstado(v.id, { versao: v.versao, novoEstado: v.novoEstado, ...(v.justificativa ? { justificativa: v.justificativa } : {}) }), 'Estado físico atualizado.');
 const status = useAction((v: { id: number; versao: number; novoStatus: import('../types').StatusRastreamento; justificativa: string }) => equipamentosApi.atualizarStatus(v.id, { versao: v.versao, novoStatus: v.novoStatus, justificativa: v.justificativa }), 'Status atualizado.');
 const baixa = useAction((v: { id: number; versao: number; justificativa: string }) => equipamentosApi.baixaDefinitiva(v.id, { versao: v.versao, justificativa: v.justificativa }), 'Baixa definitiva registrada.');
 const excluir = useMutation({ mutationFn: (id: number) => equipamentosApi.excluir(id), onSuccess: async () => { await client.invalidateQueries({ queryKey: equipamentosKeys.all }); toast('Equipamento excluído.', 'success'); }, onError });
 return { triagem, avaliar, movimentar, estado, status, baixa, excluir };
}
