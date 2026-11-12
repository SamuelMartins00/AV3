import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../app/layout';
import { HomePage } from '../features/home/pages/home-page';
import { NotFoundPage } from '../features/home/pages/not-found-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
