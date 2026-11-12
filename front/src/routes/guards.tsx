import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-6">
      <div className="flex items-center gap-3 text-sm font-medium text-emerald-950" role="status">
        <span className="size-5 animate-spin rounded-full border-2 border-emerald-800/20 border-t-emerald-800" />
        Restaurando sessão…
      </div>
    </main>
  );
}

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (status === 'password-change-required') return <Navigate to="/alterar-senha" replace />;
  return <Outlet />;
}

export function RequirePasswordChange() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  if (status !== 'password-change-required') return <Navigate to="/" replace />;
  return <Outlet />;
}

export function RequireGuest() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  if (status === 'password-change-required') return <Navigate to="/alterar-senha" replace />;
  return <Outlet />;
}
