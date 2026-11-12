import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../app/layout';
import { LoginPage } from '../features/auth/pages/login-page';
import { ProfilePage } from '../features/auth/pages/profile-page';
import { RequiredPasswordPage } from '../features/auth/pages/required-password-page';
import { HomePage } from '../features/home/pages/home-page';
import { NotFoundPage } from '../features/home/pages/not-found-page';
import { ForbiddenPage } from '../features/home/pages/forbidden-page';
import { ModulePlaceholderPage } from '../features/shared/module-placeholder-page';
import { OrganizacoesPage } from '../features/organizacoes/pages/organizacoes-page';
import { LotesPage } from '../features/lotes/pages/lotes-page';
import { EquipamentosPage } from '../features/equipamentos/pages/equipamentos-page';
import type { Papel } from '../features/auth/types';
import { RequireAuth, RequireGuest, RequirePasswordChange, RequireRoles } from './guards';

const admin: Papel[] = ['ADMINISTRADOR'];
const operator: Papel[] = ['ADMINISTRADOR', 'OPERADOR_CADASTRO'];
const manager: Papel[] = ['ADMINISTRADOR', 'GESTOR_ALMOXARIFADO'];
const auditor: Papel[] = ['ADMINISTRADOR', 'AUDITOR'];
const managerAuditor: Papel[] = ['ADMINISTRADOR', 'GESTOR_ALMOXARIFADO', 'AUDITOR'];
const modules: { path: string; roles: Papel[] }[] = [
  { path: 'organizacoes', roles: operator }, { path: 'lotes', roles: manager },
  { path: 'equipamentos', roles: managerAuditor }, { path: 'relatorios', roles: auditor },
  { path: 'analises', roles: auditor }, { path: 'tarefas', roles: auditor },
  { path: 'auditoria', roles: auditor }, { path: 'chaves-api', roles: admin },
  { path: 'usuarios', roles: admin }, { path: 'configuracao', roles: admin },
];

export const router = createBrowserRouter([
  { element: <RequireGuest />, children: [{ path: '/login', element: <LoginPage /> }] },
  { element: <RequirePasswordChange />, children: [{ path: '/alterar-senha', element: <RequiredPasswordPage /> }] },
  { element: <RequireAuth />, children: [{ path: '/', element: <AppLayout />, children: [
    { index: true, element: <HomePage /> },
    { path: 'perfil', element: <ProfilePage /> },
    { path: '403', element: <ForbiddenPage /> },
    ...modules.map(({ path, roles }) => ({ path, element: <RequireRoles roles={roles}>{path === 'organizacoes' ? <OrganizacoesPage /> : path === 'lotes' ? <LotesPage /> : path === 'equipamentos' ? <EquipamentosPage /> : <ModulePlaceholderPage />}</RequireRoles> })),
    { path: '*', element: <NotFoundPage /> },
  ] }] },
  { path: '*', element: <Navigate to="/" replace /> },
]);
