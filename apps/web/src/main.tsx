import '@raceshop/ui/styles.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { createQueryClient, routes } from '@raceshop/screens';

// VITE_AUTH_MODE is replaced at build time, so a production build (entra) contains no trace of
// the development sign-in: the dead branch and its dynamic import are removed. CI checks this.
const { AuthProvider } =
  import.meta.env.VITE_AUTH_MODE === 'dev'
    ? await import('./auth/dev')
    : await import('./auth/entra');

const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing from index.html');

createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
