import {api} from '../../lib/api';
export interface JournalRecord {id:number;timestamp:string;operacao:string;entidade:string;dadosAntes:unknown;dadosDepois:unknown;usuarioResponsavel:string}
export interface JournalResponse {pagina:number;limite:number;total:number;totalPaginas:number;registros:JournalRecord[]}
export interface JournalFilters {pagina?:number;limite?:number;entidade?:string;operacao?:string;responsavel?:string;inicio?:string;fim?:string}
export const auditoriaApi={listar:async(f:JournalFilters)=>(await api.get<JournalResponse>('/api/v1/auditoria/journal',{params:f})).data};
