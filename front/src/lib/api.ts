import axios, { type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import {
  getAccessToken,
  isAuthEndpoint,
  isPasswordChangeRequired,
  notifySessionExpired,
  refreshAccessToken,
} from '../features/auth/session';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retryAfterRefresh?: boolean;
    _skipAuthRefresh?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    _retryAfterRefresh?: boolean;
    _skipAuthRefresh?: boolean;
  }
}

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 15_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && !isAuthEndpoint(config.url)) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const original = error.config;
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retryAfterRefresh ||
      original._skipAuthRefresh ||
      isAuthEndpoint(original.url) ||
      isPasswordChangeRequired()
    ) {
      if (error.response?.status === 401 && !isAuthEndpoint(original?.url)) {
        notifySessionExpired();
      }
      return Promise.reject(error);
    }

    original._retryAfterRefresh = true;
    try {
      const newAccessToken = await refreshAccessToken();
      original.headers.set('Authorization', `Bearer ${newAccessToken}`);
      return api(original);
    } catch (refreshError) {
      // Rate limit é transitório; não descartar uma sessão que ainda pode ser renovada.
      if (!axios.isAxiosError(refreshError) || refreshError.response?.status !== 429) {
        notifySessionExpired();
      }
      return Promise.reject(refreshError);
    }
  },
);
