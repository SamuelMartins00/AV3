import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuth } from '../auth-context';
import { getAuthErrorMessage } from '../components/auth-error';

export function RequiredPasswordPage() {
  const { passwordChanged } = useAuth();
  const navigate = useNavigate();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (senhaNova !== confirmacao) {
      setError('A confirmação não corresponde à nova senha.');
      return;
    }
    if (senhaNova === senhaAtual) {
      setError('A nova senha deve ser diferente da senha atual.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword({ senhaAtual, senhaNova });
      passwordChanged();
      navigate('/login', { replace: true, state: { notice: 'Senha alterada. Entre novamente com sua nova senha.' } });
    } catch (cause) {
      setError(getAuthErrorMessage(cause, 'Não foi possível alterar a senha.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-900 text-xl font-black text-white">G</span>
          <div><p className="font-bold text-emerald-950">GreenCode</p><p className="text-xs text-slate-500">Segurança da conta</p></div>
        </div>
        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Ação obrigatória</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Crie uma nova senha</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Por segurança, altere sua senha antes de continuar. Após a alteração, todas as sessões serão encerradas e será necessário entrar novamente.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div><label htmlFor="senhaAtual" className="mb-2 block text-sm font-medium text-slate-700">Senha atual</label><input id="senhaAtual" type="password" autoComplete="current-password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /></div>
          <div><label htmlFor="senhaNova" className="mb-2 block text-sm font-medium text-slate-700">Nova senha</label><input id="senhaNova" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /><p className="mt-1.5 text-xs text-slate-400">Utilize entre 8 e 72 caracteres.</p></div>
          <div><label htmlFor="confirmacao" className="mb-2 block text-sm font-medium text-slate-700">Confirme a nova senha</label><input id="confirmacao" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /></div>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-emerald-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60">{submitting ? 'Salvando…' : 'Alterar senha e continuar'}</button>
        </form>
      </section>
    </main>
  );
}
