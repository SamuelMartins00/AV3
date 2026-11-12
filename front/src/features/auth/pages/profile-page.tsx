import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuth } from '../auth-context';
import { useUpdateUserProfile, useUserProfile } from '../hooks';
import { getAuthErrorMessage } from '../components/auth-error';
import { useToast } from '../../../app/toast-provider';

const roleLabels: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  OPERADOR_CADASTRO: 'Operador de cadastro',
  GESTOR_ALMOXARIFADO: 'Gestor de almoxarifado',
  AUDITOR: 'Auditor',
};

export function ProfilePage() {
  const { passwordChanged, user, reloadUser, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const profileQuery = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const profile = profileQuery.data;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(''); setProfileMessage('');
    try {
      const updated = await updateProfile.mutateAsync(nomeExibicao.trim());
      setNomeExibicao(updated.nomeExibicao);
      await reloadUser();
      setProfileMessage('Nome de exibição atualizado.');
      toast('Perfil atualizado com sucesso.', 'success');
    } catch (cause) { setProfileError(getAuthErrorMessage(cause, 'Não foi possível atualizar o perfil.')); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(''); setPasswordMessage('');
    if (senhaNova !== confirmacao) { setPasswordError('A confirmação não corresponde à nova senha.'); return; }
    if (senhaNova === senhaAtual) { setPasswordError('A nova senha deve ser diferente da senha atual.'); return; }
    setChangingPassword(true);
    try {
      await authApi.changePassword({ senhaAtual, senhaNova });
      passwordChanged();
      navigate('/login', { replace: true, state: { notice: 'Senha alterada. Entre novamente com sua nova senha.' } });
    } catch (cause) { setPasswordError(getAuthErrorMessage(cause, 'Não foi possível alterar a senha.')); }
    finally { setChangingPassword(false); }
  }

  async function handleLogout() {
    try { await logout(); toast('Sessão encerrada com sucesso.', 'success'); } finally { navigate('/login', { replace: true }); }
  }

  if (profileQuery.isLoading) return <p className="text-sm text-slate-500">Carregando perfil…</p>;
  if (profileQuery.isError || !profile) return <p role="alert" className="text-sm text-rose-700">Não foi possível carregar os dados do perfil. Atualize a página para tentar novamente.</p>;

  return (
    <section className="max-w-3xl space-y-8">
      <div><p className="text-sm font-semibold text-emerald-800">Conta</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Meu perfil</h1><p className="mt-2 text-sm text-slate-500">Consulte seus dados e gerencie a segurança da sua conta.</p></div>
      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-slate-950">Dados do usuário</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-user">Usuário</label><input id="profile-user" value={profile.usuario} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500" /></div>
          <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-role">Papel</label><input id="profile-role" value={roleLabels[profile.papel] ?? profile.papel} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500" /></div>
          <div className="sm:col-span-2"><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-name">Nome de exibição</label><input id="profile-name" required minLength={2} maxLength={100} value={nomeExibicao || profile.nomeExibicao} onChange={(e) => setNomeExibicao(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /></div>
        </div>
        {profileError && <p role="alert" className="mt-4 text-sm text-rose-700">{profileError}</p>}
        {profileMessage && <p role="status" className="mt-4 text-sm text-emerald-700">{profileMessage}</p>}
        <div className="mt-6 flex justify-end"><button disabled={updateProfile.isPending || !nomeExibicao.trim() || nomeExibicao.trim() === profile.nomeExibicao} className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{updateProfile.isPending ? 'Salvando…' : 'Salvar alterações'}</button></div>
      </form>
      <form onSubmit={changePassword} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-slate-950">Alterar senha</h2><p className="mt-1 text-sm text-slate-500">A alteração encerra todas as sessões. Você precisará entrar novamente.</p>
        <div className="mt-6 grid gap-5">
          <div><label htmlFor="current-password" className="mb-2 block text-sm font-medium text-slate-700">Senha atual</label><input id="current-password" type="password" autoComplete="current-password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /></div>
          <div><label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700">Nova senha</label><input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /></div>
          <div><label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700">Confirme a nova senha</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /></div>
        </div>
        {passwordError && <p role="alert" className="mt-4 text-sm text-rose-700">{passwordError}</p>}
        {passwordMessage && <p role="status" className="mt-4 text-sm text-emerald-700">{passwordMessage}</p>}
        <div className="mt-6 flex justify-end"><button type="submit" disabled={changingPassword} className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{changingPassword ? 'Alterando…' : 'Alterar senha'}</button></div>
      </form>
      <div className="flex justify-end"><button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">Sair da conta</button></div>
      <p className="sr-only">Perfil autenticado de {user?.nomeExibicao}</p>
    </section>
  );
}
