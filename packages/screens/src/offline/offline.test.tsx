import { onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { inventoryKeys } from '../api/inventory';
import { fakeApi, renderApp } from '../test/render';

const cachedPart = {
  id: 's1',
  serialNumber: 'BR380-0002',
  partId: 'p1',
  partNumber: 'BR-380-F',
  description: 'Front brake rotor, 380 mm',
  status: 'InStock',
  accumulatedUsage: 410,
  lifeLimit: 500,
  lifeUnit: 'Miles',
  lifeUsedPercent: 82,
  lifeStatus: 'Warning',
  currentInstall: null,
};

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('offline (ADR 0008)', () => {
  it('explains a page that was never saved on the device instead of spinning', async () => {
    fakeApi([]);
    onlineManager.setOnline(false);

    renderApp('/serialized-parts/s1');

    expect(await screen.findByText('Not available offline')).toBeInTheDocument();
  });

  it('shows saved data read-only, with a banner, and no way to change it', async () => {
    fakeApi([]);
    onlineManager.setOnline(false);

    renderApp('/serialized-parts/s1', ['PartsManager'], (queryClient) => {
      queryClient.setQueryData(inventoryKeys.serializedPart('s1'), cachedPart);
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'BR380-0002' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent("You're offline");
    expect(screen.getByRole('alert')).toHaveTextContent('last synced');
    expect(screen.getByRole('button', { name: 'Install on a car' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retire part' })).toBeDisabled();
  });

  it('syncs with the API as soon as the connection is back', async () => {
    const api = fakeApi([
      { path: '/api/serialized-parts/s1', body: { ...cachedPart, lifeUsedPercent: 90 } },
    ]);
    onlineManager.setOnline(false);
    renderApp('/serialized-parts/s1', ['PartsManager'], (queryClient) => {
      queryClient.setQueryData(inventoryKeys.serializedPart('s1'), cachedPart);
    });
    await screen.findByRole('heading', { level: 1, name: 'BR380-0002' });
    expect(api.requests).toHaveLength(0);

    act(() => {
      onlineManager.setOnline(true);
    });

    await waitFor(() => {
      expect(api.requests.map((request) => new URL(request.url).pathname)).toContain(
        '/api/serialized-parts/s1',
      );
    });
    expect(screen.queryByText("You're offline")).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install on a car' })).toBeEnabled();
  });
});
