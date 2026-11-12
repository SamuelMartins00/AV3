import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../app/layout';
import { LoginPage } from '../features/auth/pages/login-page';
import { ProfilePage } from '../features/auth/pages/profile-page';
import { RequiredPasswordPage } from '../features/auth/pages/required-password-page';
import { HomePage } from '../features/home/pages/home-page';
import { NotFoundPage } from '../features/home/pages/not-found-page';
import { RequireAuth, RequireGuest, RequirePasswordChange } from './guards';

export const router = createBrowserRouter([
  {
    element: <RequireGuest />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequirePasswordChange />,
    children: [{ path: '/alterar-senha', element: <RequiredPasswordPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'perfil', element: <ProfilePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
