import { client } from '@raceshop/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import { AuthContext } from '../auth/auth';
import type { AppRole, Auth } from '../auth/auth';
import { routes } from '../router';

export interface FakeRoute {
  method?: string;
  /** Path without query string, e.g. /api/parts */
  path: string;
  status?: number;
  body?: unknown;
}

/**
 * Replaces the API client's fetch with canned responses. Every request is recorded so tests can
 * assert on what the app sent (method, URL, body, auth headers).
 */
export function fakeApi(responses: FakeRoute[]) {
  const requests: Request[] = [];
  const fetchMock = vi.fn((input: Request) => {
    requests.push(input.clone());
    const url = new URL(input.url);
    const match = responses.find(
      (route) => route.path === url.pathname && (route.method ?? 'GET') === input.method,
    );
    if (!match) {
      return Promise.resolve(new Response(JSON.stringify({ title: 'Not found' }), { status: 404 }));
    }
    const status = match.status ?? 200;
    const body = status === 204 ? null : JSON.stringify(match.body ?? {});
    const headers = {
      'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json',
    };
    return Promise.resolve(new Response(body, { status, headers }));
  });
  client.setConfig({ baseUrl: 'http://test.local', fetch: fetchMock as unknown as typeof fetch });
  return { requests };
}

export function renderApp(path: string, roles: AppRole[] = ['PartsManager']) {
  const auth: Auth = {
    mode: 'dev',
    user: { name: 'tester', roles },
    signOut: vi.fn(),
    getRequestHeaders: () =>
      Promise.resolve({ 'X-Dev-User': 'tester', 'X-Dev-Roles': roles.join(',') }),
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <AuthContext value={auth}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthContext>,
  );
}
