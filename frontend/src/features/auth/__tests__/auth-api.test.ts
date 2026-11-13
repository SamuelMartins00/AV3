import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../lib/api';
import { authApi } from '../api';

afterEach(() => vi.restoreAllMocks());

describe('contratos HTTP de autenticação', () => {
  it('aceita resposta 204 de alteração de senha sem tentar ler JSON', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ status: 204, data: undefined } as never);
    await expect(authApi.changePassword({ senhaAtual: 'senha-atual', senhaNova: 'senha-nova-123' })).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith(
      '/auth/alterar-senha',
      { senhaAtual: 'senha-atual', senhaNova: 'senha-nova-123' },
      { _skipAuthRefresh: true },
    );
  });

  it('envia refresh token no corpo do logout', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ status: 204, data: undefined } as never);
    await expect(authApi.logout('refresh-para-revogar')).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-para-revogar' }, { _skipAuthRefresh: true });
  });
});
