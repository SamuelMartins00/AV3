import { api } from '../../lib/api';
import type { AuthUser, LoginResponse, UserProfile } from './types';

export interface LoginCredentials {
  usuario: string;
  senha: string;
}

export interface ChangePasswordPayload {
  senhaAtual: string;
  senhaNova: string;
}

export const authApi = {
  async login(credentials: LoginCredentials) {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials, { _skipAuthRefresh: true });
    return data;
  },
  async me() {
    const { data } = await api.get<AuthUser>('/auth/me');
    return data;
  },
  async logout(refreshToken: string) {
    await api.post<void>('/auth/logout', { refreshToken }, { _skipAuthRefresh: true });
  },
  async changePassword(payload: ChangePasswordPayload) {
    // O backend responde 204. Axios resolve sem exigir corpo JSON.
    await api.post<void>('/auth/alterar-senha', payload, { _skipAuthRefresh: true });
  },
  async profile() {
    const { data } = await api.get<UserProfile>('/usuarios/me');
    return data;
  },
  async updateProfile(nomeExibicao: string) {
    const { data } = await api.patch<UserProfile>('/usuarios/me', { nomeExibicao });
    return data;
  },
};
