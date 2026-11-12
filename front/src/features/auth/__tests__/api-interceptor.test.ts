import axios, { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../lib/api';
import { clearSession, setTokens } from '../session';

const originalAdapter = api.defaults.adapter;
const firstTokens = { accessToken: 'access-antigo', refreshToken: 'refresh-antigo', tipo: 'Bearer' as const };
const rotatedTokens = { accessToken: 'access-novo', refreshToken: 'refresh-novo', tipo: 'Bearer' as const };

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  clearSession();
  vi.restoreAllMocks();
});

describe('interceptors Axios', () => {
  it('envia Bearer, renova após 401 e repete a mesma requisição somente uma vez', async () => {
    setTokens(firstTokens);
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: rotatedTokens } as never);
    const adapter: AxiosAdapter = async (config) => {
      const authorization = config.headers.get('Authorization');
      if (authorization === 'Bearer access-antigo') {
        const response = {
          data: { erro: 'Token expirado' },
          status: 401,
          statusText: 'Unauthorized',
          headers: new AxiosHeaders(),
          config,
        };
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response);
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config };
    };
    const adapterMock = vi.fn(adapter);
    api.defaults.adapter = adapterMock;

    const response = await api.get<{ ok: boolean }>('/recurso-protegido');

    expect(response.data.ok).toBe(true);
    expect(adapterMock).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(response.config.headers.get('Authorization')).toBe('Bearer access-novo');
  });
});
