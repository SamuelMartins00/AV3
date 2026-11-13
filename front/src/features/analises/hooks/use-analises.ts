import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../app/toast-provider';
import { analisesApi } from '../api';
import type { ExecutarAnalise, FiltrosAnalises } from '../types';
export const analisesKeys = { all: ['analises'] as const, list: (f: FiltrosAnalises) => ['analises', 'list', f] as const, detail: (id: number) => ['analises', 'detail', id] as const };
export function useAnalises(f: FiltrosAnalises) { return useQuery({ queryKey: analisesKeys.list(f), queryFn: () => analisesApi.listar(f), placeholderData: p => p }); }
export function useResultadoAnalise(id: number | null) { return useQuery({ queryKey: analisesKeys.detail(id ?? 0), queryFn: () => analisesApi.buscar(id!), enabled: id !== null }); }
export function useAnaliseActions() { const client = useQueryClient(); const { toast } = useToast();
 const executar = useMutation({ mutationFn: (v: { tipo: 'eficiencia'|'rentabilidade'|'vida-util'; dados: ExecutarAnalise; key: string }) => analisesApi.executar(v.tipo, v.dados, v.key), onSuccess: () => { toast('Análise aceita. Acompanhe o processamento na tela de tarefas.', 'success'); }, onError: () => toast('Não foi possível solicitar a análise.', 'error') });
 const atualizar = useMutation({ mutationFn: (v: { id: number; titulo: string; descricao: string | null }) => analisesApi.atualizar(v.id, { titulo: v.titulo, descricao: v.descricao }), onSuccess: async (_, v) => { await client.invalidateQueries({ queryKey: analisesKeys.all }); await client.invalidateQueries({ queryKey: analisesKeys.detail(v.id) }); toast('Metadados da análise atualizados.', 'success'); }, onError: () => toast('Não foi possível atualizar a análise.', 'error') });
 const excluir = useMutation({ mutationFn: (id: number) => analisesApi.excluir(id), onSuccess: async () => { await client.invalidateQueries({ queryKey: analisesKeys.all }); toast('Registro analítico excluído.', 'success'); }, onError: () => toast('Não foi possível excluir o registro.', 'error') });
 return { executar, atualizar, excluir }; }
