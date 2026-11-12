export type Papel =
  | 'ADMINISTRADOR'
  | 'OPERADOR_CADASTRO'
  | 'GESTOR_ALMOXARIFADO'
  | 'AUDITOR';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tipo: 'Bearer';
}

export interface LoginResponse extends TokenPair {
  senhaAlteracaoObrigatoria: boolean;
}

export interface AuthUser {
  id: number;
  usuario: string;
  nomeExibicao: string;
  papel: Papel;
  ativo: boolean;
  ultimoAcesso: string | null;
}

export interface UserProfile {
  id: number;
  usuario: string;
  nomeExibicao: string;
  papel: Papel;
}

export interface ApiErrorBody {
  erro?: string;
  codigo?: string;
  message?: string;
}
