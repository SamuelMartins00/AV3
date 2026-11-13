import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';
import type { Papel } from '../features/auth/types';
import { useToast } from './toast-provider';

type NavItem = { to: string; label: string; icon: string; roles: Papel[] };
const admin: Papel[] = ['ADMINISTRADOR'];
const operator: Papel[] = ['ADMINISTRADOR', 'OPERADOR_CADASTRO'];
const manager: Papel[] = ['ADMINISTRADOR', 'GESTOR_ALMOXARIFADO'];
const auditor: Papel[] = ['ADMINISTRADOR', 'AUDITOR'];
const navigation: { heading: string; items: NavItem[] }[] = [
  { heading: 'Painel', items: [
    { to: '/', label: 'Dashboard', icon: '▧', roles: ['ADMINISTRADOR', 'OPERADOR_CADASTRO', 'GESTOR_ALMOXARIFADO', 'AUDITOR'] },
  ] },
  { heading: 'Operação', items: [
    { to: '/organizacoes', label: 'Organizações', icon: '▦', roles: operator },
    { to: '/lotes', label: 'Lotes', icon: '▤', roles: manager },
    { to: '/equipamentos', label: 'Equipamentos', icon: '▣', roles: [...manager, 'AUDITOR'] },
  ] },
  { heading: 'Inteligência', items: [
    { to: '/relatorios', label: 'Relatórios', icon: '▥', roles: auditor },
    { to: '/analises', label: 'Análises', icon: '⌁', roles: auditor },
    { to: '/tarefas', label: 'Tarefas', icon: '◷', roles: auditor },
    { to: '/auditoria', label: 'Auditoria', icon: '◎', roles: auditor },
  ] },
  { heading: 'Administração', items: [
    { to: '/chaves-api', label: 'Chaves de API', icon: '⌘', roles: admin },
    { to: '/usuarios', label: 'Usuários', icon: '♙', roles: admin },
    { to: '/configuracao', label: 'Configuração', icon: '⚙', roles: admin },
  ] },
];
const roleNames: Record<Papel, string> = {
  ADMINISTRADOR: 'Administrador', OPERADOR_CADASTRO: 'Operador de cadastro',
  GESTOR_ALMOXARIFADO: 'Gestor de almoxarifado', AUDITOR: 'Auditor',
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  async function handleLogout() {
    try { await logout(); toast('Sessão encerrada com sucesso.', 'success'); }
    catch { toast('Não foi possível encerrar a sessão no servidor. A sessão local foi encerrada.', 'info'); }
    finally { navigate('/login', { replace: true }); }
  }
  const visibleGroups = navigation.map((group) => ({ ...group, items: group.items.filter((item) => user && item.roles.includes(user.papel)) })).filter((group) => group.items.length > 0);
  const initials = (user?.nomeExibicao ?? 'U').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  const navContent = <><div className="border-b border-white/10 px-5 py-6"><Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-lg font-black text-emerald-950">G</span><span><span className="block text-lg font-bold tracking-tight text-white">GreenCode</span><span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-200/70">Logística reversa</span></span></Link></div><nav aria-label="Navegação principal" className="flex-1 space-y-7 overflow-y-auto px-3 py-6">{visibleGroups.map((group) => <div key={group.heading}><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/50">{group.heading}</p><div className="space-y-1">{group.items.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-emerald-400 text-emerald-950 shadow-sm' : 'text-emerald-50/75 hover:bg-white/10 hover:text-white'}`}><span className="grid w-5 place-items-center text-base" aria-hidden="true">{item.icon}</span>{item.label}</NavLink>)}</div></div>)}</nav><div className="border-t border-white/10 p-3"><NavLink to="/perfil" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 ${isActive ? 'bg-white/10' : 'hover:bg-white/10'}`}><span className="grid size-9 place-items-center rounded-full bg-emerald-800 text-xs font-bold text-emerald-100">{initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">Meu perfil</span><span className="block truncate text-xs text-emerald-100/60">{user?.nomeExibicao}</span></span><span className="text-emerald-100/50">›</span></NavLink></div></>;
  return <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex"><aside className="hidden w-64 shrink-0 flex-col bg-[#073b32] lg:fixed lg:inset-y-0 lg:flex">{navContent}</aside>{sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setSidebarOpen(false)}><aside className="flex h-full w-[min(84vw,18rem)] flex-col bg-[#073b32] shadow-2xl" onClick={(event) => event.stopPropagation()}>{navContent}</aside></div>}<div className="min-w-0 flex-1 lg:ml-64"><header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button type="button" onClick={() => setSidebarOpen(true)} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-xl text-slate-700 hover:bg-slate-50 lg:hidden" aria-label="Abrir menu">☰</button><div><p className="text-xs font-medium text-slate-400">GreenCode </p><p className="text-sm font-semibold text-slate-800">Painel de operações</p></div></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">{user?.nomeExibicao}</p><p className="text-xs text-slate-500">{user?.papel ? roleNames[user.papel] : ''}</p></div><span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-900 sm:hidden">{initials}</span><button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">Sair</button></div></header><main className="mx-auto min-h-[calc(100vh-132px)] w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-9"><Outlet /></main><footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-400 sm:px-7">GreenCode · Plataforma de logística reversa</footer></div></div>;
}
