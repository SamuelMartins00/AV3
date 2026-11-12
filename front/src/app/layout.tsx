import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-emerald-950/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-900 text-lg font-bold text-white" aria-hidden="true">G</span>
            <span><span className="block text-lg font-bold tracking-tight text-emerald-950">GreenCode</span><span className="block text-xs text-slate-500">Logística reversa inteligente</span></span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">{user?.nomeExibicao}</p><p className="text-xs text-slate-500">{user?.papel?.replaceAll('_', ' ')}</p></div>
            <NavLink to="/perfil" className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-emerald-50 text-emerald-900' : 'text-slate-600 hover:bg-slate-50'}`}>Meu perfil</NavLink>
            <button onClick={() => void handleLogout()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Sair</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-5 py-5 text-xs text-slate-500 sm:px-8">GreenCode · Plataforma de logística reversa</div></footer>
    </div>
  );
}
