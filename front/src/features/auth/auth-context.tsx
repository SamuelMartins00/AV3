import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from './api';
import { clearSession, getRefreshToken, isPasswordChangeRequired, refreshAccessToken, setSessionExpiredHandler, setTokens } from './session';
import type { AuthUser, LoginResponse } from './types';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'password-change-required';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (usuario: string, senha: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  passwordChanged: () => void;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
let restoreSessionPromise: Promise<AuthUser | null> | null = null;

function restoreSessionOnce(): Promise<AuthUser | null> {
  if (restoreSessionPromise) return restoreSessionPromise;
  restoreSessionPromise = (async () => {
    // O access token não é persistido. Para contas com troca obrigatória,
    // é necessário autenticar novamente após um reload para obter um novo JWT.
    if (isPasswordChangeRequired()) {
      clearSession();
      return null;
    }
    if (!getRefreshToken()) return null;
    try {
      await refreshAccessToken();
      return await authApi.me();
    } catch (error) {
      // Rate limit não revoga a sessão; mantém o refresh token para uma nova tentativa.
      if (!axios.isAxiosError(error) || error.response?.status !== 429) clearSession();
      return null;
    }
  })();
  return restoreSessionPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const expire = useCallback(() => {
    queryClient.clear();
    setUser(null);
    setStatus('anonymous');
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(expire);
    void restoreSessionOnce().then((restoredUser) => {
      if (restoredUser) {
        setUser(restoredUser);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('anonymous');
      }
    });
    return () => setSessionExpiredHandler(null);
  }, [expire]);

  const login = useCallback(async (usuario: string, senha: string) => {
    queryClient.clear();
    const result = await authApi.login({ usuario, senha });
    setTokens(result, result.senhaAlteracaoObrigatoria);
    if (result.senhaAlteracaoObrigatoria) {
      setUser(null);
      setStatus('password-change-required');
      return result;
    }
    const currentUser = await authApi.me();
    setUser(currentUser);
    setStatus('authenticated');
    restoreSessionPromise = Promise.resolve(currentUser);
    return result;
  }, [queryClient]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // O logout local continua obrigatório mesmo se a API estiver indisponível.
    } finally {
      clearSession();
      queryClient.clear();
      restoreSessionPromise = null;
      setUser(null);
      setStatus('anonymous');
    }
  }, [queryClient]);

  const passwordChanged = useCallback(() => {
    clearSession();
    queryClient.clear();
    restoreSessionPromise = null;
    setUser(null);
    setStatus('anonymous');
  }, [queryClient]);

  const reloadUser = useCallback(async () => {
    const currentUser = await authApi.me();
    setUser(currentUser);
  }, []);

  const value = useMemo(() => ({ status, user, login, logout, passwordChanged, reloadUser }), [status, user, login, logout, passwordChanged, reloadUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  return context;
}
