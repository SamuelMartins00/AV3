import { api } from '../../lib/api';
import { tarefasApi } from '../tarefas/api';
export type StatusRastreamento = 'AGUARDANDO_TRIAGEM'|'EM_TRIAGEM'|'AGUARDANDO_DESMONTE'|'EM_DESMONTE'|'PECAS_REAPROVEITADAS'|'MATERIAL_RECICLAVEL'|'DESCARTE_SEGURO'|'BAIXA_DEFINITIVA';
export type TipoRelatorio = 'ORGANIZACAO'|'STATUS'|'FINANCEIRO';
export const statusRastreamento: StatusRastreamento[] = ['AGUARDANDO_TRIAGEM','EM_TRIAGEM','AGUARDANDO_DESMONTE','EM_DESMONTE','PECAS_REAPROVEITADAS','MATERIAL_RECICLAVEL','DESCARTE_SEGURO','BAIXA_DEFINITIVA'];
const base='/relatorios';
export interface SolicitarRelatorioAssincrono { organizacaoId?: number; inicio?: string; fim?: string; status?: StatusRastreamento }
export const relatoriosApi={
 porOrganizacao: async (id:number,inicio:string,fim:string)=>(await api.get(`${base}/organizacao/${id}`,{params:{inicio,fim}})).data as Record<string,unknown>,
 porStatus: async (status:StatusRastreamento)=>(await api.get(`${base}/status`,{params:{status}})).data as Record<string,unknown>,
 financeiro: async (inicio:string,fim:string)=>(await api.get(`${base}/financeiro`,{params:{inicio,fim}})).data as Record<string,unknown>,
 solicitarAssincrono: async (tipo:TipoRelatorio, entrada:SolicitarRelatorioAssincrono, chave:string) => tarefasApi.criar({ tipo:'GERACAO_RELATORIO', ...(tipo==='ORGANIZACAO'&&entrada.organizacaoId?{organizacaoId:entrada.organizacaoId}:{}), parametros:{ relatorio:tipo, ...(tipo==='STATUS'&&entrada.status?{status:entrada.status}:{}), ...(tipo!=='STATUS'?{inicio:entrada.inicio,fim:entrada.fim}:{}) } }, chave),
};
