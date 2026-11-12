import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { getAuthErrorMessage } from '../components/auth-error';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(usuario.trim(), senha);
      navigate(result.senhaAlteracaoObrigatoria ? '/alterar-senha' : (location.state as { from?: string } | null)?.from || '/', { replace: true });
    } catch (cause) {
      setError(getAuthErrorMessage(cause, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-stone-50 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-emerald-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-28 -top-28 size-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-24 size-[30rem] rounded-full border border-white/10" />
        <Link to="/login" className="relative flex w-fit items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-400 text-xl font-black text-emerald-950">G</span>
          <span className="text-xl font-bold tracking-tight">GreenCode</span>
        </Link>
        <div className="relative max-w-xl pb-10">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Logística reversa inteligente</p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Tecnologia para um futuro mais circular.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-emerald-100/75">Gestão, rastreabilidade e inteligência para transformar o ciclo de vida dos equipamentos eletrônicos.</p>
        </div>
        <p className="relative text-xs text-emerald-100/50">GreenCode · Plataforma de logística reversa</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-900 text-lg font-black text-white">G</span>
            <span className="text-lg font-bold text-emerald-950">GreenCode</span>
          </div>
          <p className="text-sm font-semibold text-emerald-800">Bem-vindo de volta</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Acesse sua conta</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Informe suas credenciais para acessar a plataforma.</p>
          {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div>
              <label htmlFor="usuario" className="mb-2 block text-sm font-medium text-slate-700">Usuário</label>
              <input id="usuario" name="usuario" autoComplete="username" required maxLength={100} value={usuario} onChange={(event) => setUsuario(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" placeholder="Seu usuário" />
            </div>
            <div>
              <label htmlFor="senha" className="mb-2 block text-sm font-medium text-slate-700">Senha</label>
              <input id="senha" name="senha" type="password" autoComplete="current-password" required maxLength={200} value={senha} onChange={(event) => setSenha(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" placeholder="Sua senha" />
            </div>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center rounded-xl bg-emerald-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">Acesso restrito a usuários autorizados.</p>
        </div>
      </section>
    </main>
  );
}
