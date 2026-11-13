import { api } from '../../lib/api';
import type { CriarOrganizacao, DadosContrato, FiltrosOrganizacoes, Organizacao, OrganizacaoOpcao, OrganizacoesResponse } from './types';
const base = '/organizacoes';
export const organizacoesApi = {
  listar: async (filtros: FiltrosOrganizacoes) => (await api.get<OrganizacoesResponse>(base, { params: filtros })).data,
  opcoes: async (todas = false) => (await api.get<OrganizacaoOpcao[]>(`${base}/opcoes`, { params: todas ? { todas: true } : {} })).data,
  buscar: async (id: number) => (await api.get<Organizacao>(`${base}/${id}`)).data,
  criar: async (dados: CriarOrganizacao) => (await api.post<Organizacao>(base, dados)).data,
  atualizar: async (id: number, dados: { versao: number; cnpj?: string; enderecoCompleto?: string; desativar?: true }) => (await api.patch<Organizacao>(`${base}/${id}`, dados)).data,
  reativar: async (id: number, versao: number) => (await api.post<Organizacao>(`${base}/${id}/reativar`, { versao })).data,
  criarContrato: async (id: number, dados: DadosContrato) => (await api.post<Organizacao>(`${base}/${id}/contrato`, dados)).data,
  renovar: async (id: number, novoVencimento: string, versao: number) => (await api.post<Organizacao>(`${base}/${id}/contrato/renovar`, { novoVencimento, versao })).data,
  encerrar: async (id: number, motivo: string, versao: number) => (await api.post<Organizacao>(`${base}/${id}/contrato/encerrar`, { motivo, versao })).data,
  encerrarRetroativo: async (id: number, motivo: string, dataEncerramento: string, versao: number) => (await api.post<Organizacao>(`${base}/${id}/contrato/encerrar-retroativo`, { motivo, dataEncerramento, versao })).data,
};
