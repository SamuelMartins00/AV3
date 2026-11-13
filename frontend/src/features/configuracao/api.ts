import {api} from '../../lib/api';
export interface Configuracao {aliquotaImpostos:number;aliquotaPercentual:number;coeficienteDepreciacao:number;valorBaseDepreciacao:number}
export type ConfiguracaoUpdate=Partial<Pick<Configuracao,'aliquotaImpostos'|'coeficienteDepreciacao'|'valorBaseDepreciacao'>>;
export const configuracaoApi={obter:async()=>(await api.get<Configuracao>('/configuracao')).data,atualizar:async(d:ConfiguracaoUpdate)=>(await api.patch<Configuracao>('/configuracao',d)).data};
