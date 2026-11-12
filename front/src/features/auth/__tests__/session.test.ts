import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  isPasswordChangeRequired,
  refreshAccessToken,
  setTokens,
} from '../session';
import type { TokenPair } from '../types';

const initialTokens: TokenPair = {
  accessToken: 'access-inicial',
  refreshToken: 'refresh-inicial',
  tipo: 'Bearer',
};

const rotatedTokens: TokenPair = {
  accessToken: 'access-rotacionado',
  refreshToken: 'refresh-rotacionado',
  tipo: 'Bearer',
};

afterEach(() => {
  clearSession();
  vi.restoreAllMocks();
});

describe('gerenciamento da sessão', () => {
  it('mantém access token em memória e refresh token na sessionStorage', () => {
    setTokens(initialTokens);
    expect(getAccessToken()).toBe('access-inicial');
    expect(getRefreshToken()).toBe('refresh-inicial');
    expect(sessionStorage.getItem('greencode.refreshToken')).toBe('refresh-inicial');
  });

  it('compartilha uma única Promise entre refreshes concorrentes e persiste a rotação', async () => {
    setTokens(initialTokens);
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: rotatedTokens } as never);

    const first = refreshAccessToken();
    const second = refreshAccessToken();

    expect(first).toBe(second);
    await expect(first).resolves.toBe('access-rotacionado');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/refresh$/),
      { refreshToken: 'refresh-inicial' },
      expect.objectContaining({ timeout: 15_000 }),
    );
    expect(getAccessToken()).toBe('access-rotacionado');
    expect(getRefreshToken()).toBe('refresh-rotacionado');
  });

  it('limpa a sessão quando o endpoint de refresh rejeita o token', async () => {
    setTokens(initialTokens);
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh inválido'));
    await expect(refreshAccessToken()).rejects.toThrow('refresh inválido');
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('preserva a sessão quando o refresh recebe HTTP 429', async () => {
    setTokens(initialTokens);
    const rateLimit = new axios.AxiosError('Too Many Requests');
    rateLimit.response = {
      data: { erro: 'Muitas tentativas' }, status: 429, statusText: 'Too Many Requests',
      headers: {}, config: { headers: new axios.AxiosHeaders() },
    } as never;
    vi.spyOn(axios, 'post').mockRejectedValue(rateLimit);
    await expect(refreshAccessToken()).rejects.toBe(rateLimit);
    expect(getAccessToken()).toBe('access-inicial');
    expect(getRefreshToken()).toBe('refresh-inicial');
  });

  it('não tenta renovar quando a troca obrigatória de senha está pendente', async () => {
    setTokens(initialTokens, true);
    const post = vi.spyOn(axios, 'post');

    await expect(refreshAccessToken()).rejects.toThrow('troca obrigatória');
    expect(isPasswordChangeRequired()).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it('limpa os tokens e o marcador de senha obrigatória', () => {
    setTokens(initialTokens, true);
    clearSession();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(isPasswordChangeRequired()).toBe(false);
  });
});
