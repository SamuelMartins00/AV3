import { useAuth } from '../../auth/auth-context';

export function HomePage() {
  const { user } = useAuth();
  return (
    <section className="max-w-3xl">
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">Sessão autenticada</span>
      <h1 className="mt-5 text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">Olá, {user?.nomeExibicao ?? 'bem-vindo'}.</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">A autenticação do GreenCode está ativa. Os módulos operacionais serão disponibilizados nas próximas fases de implementação.</p>
      <div className="mt-9 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-emerald-950">Acesso atual</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Você entrou como <strong>{user?.papel?.replaceAll('_', ' ')}</strong>. A autorização definitiva das operações continua sendo validada pelo backend.</p>
      </div>
    </section>
  );
}
