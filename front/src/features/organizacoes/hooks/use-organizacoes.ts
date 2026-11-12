import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizacoesApi } from '../api';
import type { CriarOrganizacao, DadosContrato, FiltrosOrganizacoes } from '../types';
import { useToast } from '../../../app/toast-provider';
export const organizacoesKeys = { all: ['organizacoes'] as const, list: (filters: FiltrosOrganizacoes) => [...organizacoesKeys.all, 'list', filters] as const, detail: (id: number) => [...organizacoesKeys.all, 'detail', id] as const, options: ['organizacoes', 'opcoes'] as const };
export function useOrganizacoes(filters: FiltrosOrganizacoes) { return useQuery({ queryKey: organizacoesKeys.list(filters), queryFn: () => organizacoesApi.listar(filters), placeholderData: (previous) => previous }); }
export function useOrganizacao(id: number | null) { return useQuery({ queryKey: organizacoesKeys.detail(id ?? 0), queryFn: () => organizacoesApi.buscar(id!), enabled: id !== null }); }
export function useOrganizacaoOpcoes(todas = false) { return useQuery({ queryKey: [...organizacoesKeys.options, todas], queryFn: () => organizacoesApi.opcoes(todas) }); }
export function useOrganizacaoMutations() {
  const client = useQueryClient(); const { toast } = useToast();
  const refresh = async (id?: number) => { await client.invalidateQueries({ queryKey: organizacoesKeys.all }); if (id) await client.invalidateQueries({ queryKey: organizacoesKeys.detail(id) }); await client.invalidateQueries({ queryKey: organizacoesKeys.options }); };
  const onError = (error: unknown) => { const response = (error as { response?: { data?: { message?: string; error?: string; erro?: string } } })?.response?.data; toast(response?.message ?? response?.erro ?? response?.error ?? 'Não foi possível concluir a operação.', 'error'); };
  const onSuccess = async (_data: unknown, variables: { id?: number }) => { await refresh(variables.id); toast('Operação concluída com sucesso.', 'success'); };
  const criar = useMutation({ mutationFn: (dados: CriarOrganizacao) => organizacoesApi.criar(dados), onSuccess: async () => { await refresh(); toast('Organização cadastrada.', 'success'); }, onError });
  const atualizar = useMutation({ mutationFn: (v: { id: number; versao: number; cnpj?: string; enderecoCompleto?: string; desativar?: true }) => { const { id, ...body } = v; return organizacoesApi.atualizar(id, body); }, onSuccess, onError });
  const reativar = useMutation({ mutationFn: (v: { id: number; versao: number }) => organizacoesApi.reativar(v.id, v.versao), onSuccess, onError });
  const criarContrato = useMutation({ mutationFn: (v: { id: number; dados: DadosContrato }) => organizacoesApi.criarContrato(v.id, v.dados), onSuccess, onError });
  const renovar = useMutation({ mutationFn: (v: { id: number; novoVencimento: string; versao: number }) => organizacoesApi.renovar(v.id, v.novoVencimento, v.versao), onSuccess, onError });
  const encerrar = useMutation({ mutationFn: (v: { id: number; motivo: string; versao: number }) => organizacoesApi.encerrar(v.id, v.motivo, v.versao), onSuccess, onError });
  const encerrarRetroativo = useMutation({ mutationFn: (v: { id: number; motivo: string; dataEncerramento: string; versao: number }) => organizacoesApi.encerrarRetroativo(v.id, v.motivo, v.dataEncerramento, v.versao), onSuccess, onError });
  return { criar, atualizar, reativar, criarContrato, renovar, encerrar, encerrarRetroativo };
}
