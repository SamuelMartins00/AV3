import axios from 'axios';
import type { ApiErrorBody } from '../types';

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return fallback;
  const status = error.response?.status;
  const body = error.response?.data;
  if (status === 429) return body?.erro ?? body?.message ?? 'Muitas tentativas. Aguarde um instante e tente novamente.';
  if (status === 401) return body?.erro ?? 'Credenciais inválidas ou sessão expirada.';
  if (status === 403 && body?.codigo === 'SENHA_ALTERACAO_OBRIGATORIA') return 'É necessário alterar sua senha para continuar.';
  if (status === 403) return body?.erro ?? 'Você não tem permissão para realizar esta operação.';
  if (status === 422 || status === 400) return body?.erro ?? 'Confira os dados informados.';
  return body?.erro ?? fallback;
}
