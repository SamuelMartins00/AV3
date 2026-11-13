import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../app/toast-provider';
import { tarefasApi } from '../api';
import type { FiltrosTarefas, StatusTarefa } from '../types';
export function proximoIntervaloPolling(status: StatusTarefa | undefined, atualizacoes: number): number | false {
  if (status === 'CONCLUIDA' || status === 'FALHOU' || status === 'CANCELADA') return false;
  return atualizacoes <= 1 ? 2000 : 4000;
}
export const tarefasKeys = { all: ['tarefas'] as const, list: (f: FiltrosTarefas) => ['tarefas', 'list', f] as const, detail: (id: string) => ['tarefas', 'detail', id] as const };
export function useTarefas(filtros: FiltrosTarefas) { return useQuery({ queryKey: tarefasKeys.list(filtros), queryFn: () => tarefasApi.listar(filtros), placeholderData: p => p }); }
export function useTarefa(id: string | null, polling = true) {
  return useQuery({ queryKey: tarefasKeys.detail(id ?? ''), queryFn: () => tarefasApi.buscar(id!), enabled: !!id,
    refetchInterval: q => polling ? proximoIntervaloPolling(q.state.data?.status, q.state.dataUpdateCount) : false,
    refetchIntervalInBackground: false });
}
export function useTarefaActions() {
  const client = useQueryClient(); const { toast } = useToast();
  const refresh = async (id?: string) => { await client.invalidateQueries({ queryKey: tarefasKeys.all }); if (id) await client.invalidateQueries({ queryKey: tarefasKeys.detail(id) }); };
  const cancelar = useMutation({ mutationFn: (id: string) => tarefasApi.cancelar(id), onSuccess: async (_, id) => { await refresh(id); toast('Tarefa cancelada.', 'success'); }, onError: () => toast('Não foi possível cancelar. Apenas tarefas pendentes podem ser canceladas.', 'error') });
  const excluir = useMutation({ mutationFn: (id: string) => tarefasApi.excluir(id), onSuccess: async () => { await refresh(); toast('Tarefa removida.', 'success'); }, onError: () => toast('A tarefa só pode ser excluída em estado terminal.', 'error') });
  return { cancelar, excluir };
}
