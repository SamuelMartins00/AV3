import { describe, expect, it } from 'vitest';
import axios from 'axios';
import { getAuthErrorMessage } from '../components/auth-error';

describe('mensagens de autenticação', () => {
  it('reconhece especificamente o código de troca obrigatória de senha', () => {
    const error = new axios.AxiosError('Forbidden');
    error.response = {
      data: { erro: 'É obrigatório alterar a senha', codigo: 'SENHA_ALTERACAO_OBRIGATORIA' },
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    } as never;
    expect(getAuthErrorMessage(error, 'fallback')).toContain('alterar sua senha');
  });

  it('não interpreta um 403 genérico como troca obrigatória', () => {
    const error = new axios.AxiosError('Forbidden');
    error.response = {
      data: { erro: 'Sem permissão', codigo: 'SEM_PERMISSAO' },
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    } as never;
    expect(getAuthErrorMessage(error, 'fallback')).toBe('Sem permissão');
  });
});
