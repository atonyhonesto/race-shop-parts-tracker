import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { fakeApi, renderApp } from '../test/render';

const rotor = {
  id: 'p1',
  partNumber: 'BR-380-F',
  description: 'Front brake rotor, 380 mm',
  category: 'Brakes',
  manufacturer: 'Brembo',
  lifeLimit: 500,
  lifeUnit: 'Miles',
  cost: 1450,
  inStockCount: 2,
  installedCount: 1,
};

describe('Parts page', () => {
  it('lists parts from the API with links to the part', async () => {
    fakeApi([
      { path: '/api/parts', body: { items: [rotor], page: 1, pageSize: 25, totalCount: 1 } },
    ]);

    renderApp('/parts');

    const table = await screen.findByRole('table', { name: 'All parts' });
    expect(within(table).getByRole('link', { name: 'BR-380-F' })).toHaveAttribute(
      'href',
      '/parts/p1',
    );
    expect(within(table).getByRole('cell', { name: '500 mi' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent(
      'Page 1 of 1 (1 parts)',
    );
  });

  it('sends the search term and the signed-in user to the API', async () => {
    const api = fakeApi([
      { path: '/api/parts', body: { items: [], page: 1, pageSize: 25, totalCount: 0 } },
    ]);
    renderApp('/parts');
    await screen.findByRole('table');

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search parts' }), 'brembo');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByRole('table', { name: 'Parts matching "brembo"' }),
    ).toBeInTheDocument();
    const last = api.requests.at(-1);
    expect(new URL(last?.url ?? '').searchParams.get('search')).toBe('brembo');
    expect(last?.headers.get('X-Dev-User')).toBe('tester');
  });

  it('shows the API error instead of an empty table', async () => {
    fakeApi([
      {
        path: '/api/parts',
        status: 500,
        body: { title: 'Server error', detail: 'Database is resuming.' },
      },
    ]);

    renderApp('/parts');

    expect(await screen.findByRole('alert')).toHaveTextContent('Database is resuming.');
  });
});
