import { describe, expect, it } from 'vitest';

import { buildUpstreamRequest } from '../src/main/apiProxy';

const API = 'https://raceshop-api.azurewebsites.net';
const bearer = { Authorization: 'Bearer real-token' };

describe('buildUpstreamRequest (main-process API proxy)', () => {
  it('sends the path and query to the configured API, never to a host the renderer chose', async () => {
    const upstream = await buildUpstreamRequest(
      new Request('app://bundle/api/parts?search=rotor&page=2'),
      API,
      bearer,
    );

    expect(upstream.url).toBe(`${API}/api/parts?search=rotor&page=2`);
  });

  it('adds credentials in the main process and drops any the renderer tried to send', async () => {
    const request = new Request('app://bundle/api/parts', {
      headers: {
        Authorization: 'Bearer forged',
        'X-Dev-User': 'mallory',
        'X-Dev-Roles': 'PartsManager',
        Cookie: 'a=b',
        Accept: 'application/json',
      },
    });

    const upstream = await buildUpstreamRequest(request, API, bearer);

    expect(upstream.init.headers).toEqual({
      accept: 'application/json',
      Authorization: 'Bearer real-token',
    });
  });

  it('forwards the method and JSON body for changes', async () => {
    const request = new Request('app://bundle/api/serialized-parts/s1/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId: 'c24' }),
    });

    const upstream = await buildUpstreamRequest(request, API, bearer);

    expect(upstream.init.method).toBe('POST');
    expect(upstream.init.headers['content-type']).toBe('application/json');
    expect(new TextDecoder().decode(upstream.init.body)).toBe('{"carId":"c24"}');
  });

  it('sends no body for GET', async () => {
    const upstream = await buildUpstreamRequest(new Request('app://bundle/api/cars'), API, bearer);

    expect(upstream.init.body).toBeUndefined();
  });

  it('refuses anything outside /api/', async () => {
    await expect(
      buildUpstreamRequest(new Request('app://bundle/index.html'), API, bearer),
    ).rejects.toThrow('Not an API path');
  });
});
