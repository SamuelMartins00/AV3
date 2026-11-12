import axios from 'axios';
import { env } from '../../lib/env';
import type { TokenPair } from './types';

const REFRESH_TOKEN_KEY = 'greencode.refreshToken';
const PASSWORD_CHANGE_KEY = 'greencode.passwordChangeRequired';

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function isPasswordChangeRequired() {
  return sessionStorage.getItem(PASSWORD_CHANGE_KEY) === 'true';
}

export function setTokens(tokens: TokenPair, passwordChangeRequired = false) {
  accessToken = tokens.accessToken;
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (passwordChangeRequired) {
    sessionStorage.setItem(PASSWORD_CHANGE_KEY, 'true');
  } else {
    sessionStorage.removeItem(PASSWORD_CHANGE_KEY);
  }
}

export function clearSession() {
  accessToken = null;
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(PASSWORD_CHANGE_KEY);
  refreshPromise = null;
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

export function notifySessionExpired() {
  clearSession();
  sessionExpiredHandler?.();
}

/**
 * Single-flight refresh: todas as requisições 401 concorrentes aguardam a mesma
 * Promise. O endpoint é chamado com Axios puro para não entrar no interceptor.
 */
export function refreshAccessToken(): Promise<string> {
  if (isPasswordChangeRequired()) {
    return Promise.reject(new Error('A troca obrigatória de senha está pendente.'));
  }

  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.reject(new Error('Não há refresh token disponível.'));

  refreshPromise = axios
    .post<TokenPair>(`${env.apiUrl}/auth/refresh`, { refreshToken }, { timeout: 15_000 })
    .then(({ data }) => {
      setTokens(data, false);
      return data.accessToken;
    })
    .catch((error: unknown) => {
      // 429 é transitório: preserva os tokens para uma nova tentativa posterior.
      if (!axios.isAxiosError(error) || error.response?.status !== 429) {
        notifySessionExpired();
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise!;
}

export function isAuthEndpoint(url?: string) {
  return Boolean(url && /\/auth\/(login|refresh|logout)$/.test(url));
}
