import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { fakeApi, renderApp } from '../test/render';

const inStockPart = {
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

const cars = [{ id: 'c24', carNumber: '24', team: 'Red Line Racing', chassisId: 'CH-24' }];

describe('Serialized part page', () => {
  it('hides install, remove and retire from crew chiefs', async () => {
    fakeApi([{ path: '/api/serialized-parts/s1', body: inStockPart }]);

    renderApp('/serialized-parts/s1', ['CrewChief']);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'BR380-0002' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install on a car' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Only parts managers can install, remove or retire parts.'),
    ).toBeInTheDocument();
  });

  it('installs on the chosen car and warns when the part is near its life limit', async () => {
    const api = fakeApi([
      { path: '/api/serialized-parts/s1', body: inStockPart },
      { path: '/api/cars', body: cars },
      {
        method: 'POST',
        path: '/api/serialized-parts/s1/install',
        body: { installRecordId: 'i1', lifeStatus: 'Warning', lifeUsedPercent: 82 },
      },
    ]);
    renderApp('/serialized-parts/s1', ['PartsManager']);

    await userEvent.click(await screen.findByRole('button', { name: 'Install on a car' }));
    const dialog = screen.getByRole('dialog', { name: 'Install BR380-0002' });
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Car' }),
      '#24 (Red Line Racing)',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Installed, near life limit');
    expect(dialog).not.toBeInTheDocument();
    const install = api.requests.find((request) => request.method === 'POST');
    expect(await install?.json()).toEqual({ carId: 'c24' });
  });

  it('asks for a car before installing', async () => {
    fakeApi([
      { path: '/api/serialized-parts/s1', body: inStockPart },
      { path: '/api/cars', body: cars },
    ]);
    renderApp('/serialized-parts/s1', ['PartsManager']);

    await userEvent.click(await screen.findByRole('button', { name: 'Install on a car' }));
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));

    expect(screen.getByRole('combobox', { name: 'Car' })).toHaveAccessibleDescription(
      'Choose a car.',
    );
  });

  it('shows the API reason when a rule blocks the install', async () => {
    fakeApi([
      { path: '/api/serialized-parts/s1', body: inStockPart },
      { path: '/api/cars', body: cars },
      {
        method: 'POST',
        path: '/api/serialized-parts/s1/install',
        status: 409,
        body: {
          title: 'Business rule violated',
          detail: 'Part BR380-0002 is already installed.',
          code: 'part.already_installed',
        },
      },
    ]);
    renderApp('/serialized-parts/s1', ['PartsManager']);

    await userEvent.click(await screen.findByRole('button', { name: 'Install on a car' }));
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Car' }),
      '#24 (Red Line Racing)',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Part BR380-0002 is already installed.',
    );
  });
});
