import { Navigate } from 'react-router';
import type { RouteObject } from 'react-router';

import { RootLayout } from './RootLayout';
import { NotFoundPage, PageLoading, RouteErrorPage } from './pages/StatusPages';

/**
 * Each page is its own chunk, loaded on first visit, so the initial download is only the shell
 * and the first screen. The bundle budget (scripts/check-bundle-size.mjs) keeps it that way.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    HydrateFallback: PageLoading,
    children: [
      { index: true, element: <Navigate to="/parts" replace /> },
      {
        path: 'parts',
        lazy: async () => ({ Component: (await import('./pages/PartsPage')).PartsPage }),
      },
      {
        path: 'parts/:partId',
        lazy: async () => ({ Component: (await import('./pages/PartDetailPage')).PartDetailPage }),
      },
      {
        path: 'serialized-parts/:id',
        lazy: async () => ({
          Component: (await import('./pages/SerializedPartPage')).SerializedPartPage,
        }),
      },
      {
        path: 'cars',
        lazy: async () => ({ Component: (await import('./pages/CarsPage')).CarsPage }),
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
];
