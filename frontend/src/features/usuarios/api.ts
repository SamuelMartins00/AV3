import { api } from '../../lib/api';
import type { Papel } from '../auth/types';
export interface Usuario { id:number; usuario:string; nomeExibicao:string; papel:Papel; ativo:boolean; ultimoAcesso:string|null; criadoEm:string }
export interface UsuariosResponse { items:Usuario[]; pagination:{page:number;limit:number;total:number;totalPages:number} }
export interface UsuariosFiltros { page?:number; limit?:number; papel?:Papel; ativo?:boolean }
const base='/usuarios';
export const usuariosApi={
 listar:async(f:UsuariosFiltros)=>(await api.get<UsuariosResponse>(base,{params:f})).data,
 buscar:async(id:number)=>(await api.get<Usuario>(`${base}/${id}`)).data,
 criar:async(d:{usuario:string;nomeExibicao:string;senha:string;papel:Papel;senhaAtualAdmin?:string})=>(await api.post<Usuario>(base,d)).data,
 atualizar:async(id:number,d:{nomeExibicao?:string;papel?:Papel;senhaAtualAdmin?:string})=>(await api.patch<Usuario>(`${base}/${id}`,d)).data,
 redefinirSenha:async(id:number,senhaNova:string)=>api.put(`${base}/${id}/senha`,{senhaNova}),
 desativar:async(id:number)=>(await api.patch<Usuario>(`${base}/${id}/desativar`)).data,
 reativar:async(id:number)=>(await api.patch<Usuario>(`${base}/${id}/reativar`)).data,
 excluir:async(id:number)=>api.delete(`${base}/${id}`),
};
