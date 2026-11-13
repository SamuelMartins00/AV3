import {api} from '../../lib/api';
export type PermissaoChave='LOTES_ESCRITA'|'LOTES_LEITURA'|'RASTREABILIDADE_LEITURA'|'ANALISES_LEITURA'|'EQUIPAMENTOS_LEITURA'|'RELATORIOS_LEITURA'|'TAREFAS_LEITURA'|'TAREFAS_ESCRITA';
export interface ChaveApi {id:number;organizacaoId:number;nome:string;prefixo:string;permissoes:PermissaoChave[];ativa:boolean;expiraEm:string|null;ultimoUsoEm:string|null;criadoEm:string;revogadoEm:string|null}
export interface ChaveComSegredo {chave:ChaveApi;segredo:string}
const base='/chaves-api';
export const chavesApi={listar:async(organizacaoId?:number)=>(await api.get<ChaveApi[]>(base,{params:organizacaoId?{organizacaoId}:{}})).data,buscar:async(id:number)=>(await api.get<ChaveApi>(`${base}/${id}`)).data,criar:async(d:{organizacaoId:number;nome:string;permissoes:PermissaoChave[];expiraEm?:string})=>(await api.post<ChaveComSegredo>(base,d)).data,revogar:async(id:number)=>api.post(`${base}/${id}/revogar`),rotacionar:async(id:number)=>(await api.post<ChaveComSegredo>(`${base}/${id}/rotacionar`)).data};
