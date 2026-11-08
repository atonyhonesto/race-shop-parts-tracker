import { describe, expect, it } from 'vitest';

import { readConfig } from '../src/main/config';

const entra = {
  VITE_ENTRA_TENANT_ID: 'tenant',
  VITE_ENTRA_DESKTOP_CLIENT_ID: 'desktop-client',
  VITE_API_SCOPE: 'api://api-client/access_as_user',
};

describe('readConfig', () => {
  it('uses Entra ID unless the build says dev', () => {
    const config = readConfig({ ...entra, VITE_API_BASE_URL: 'https://api.example.com' }, true);

    expect(config.authMode).toBe('entra');
    expect(config.entra?.clientId).toBe('desktop-client');
  });

  it('requires the Entra settings for an Entra build', () => {
    expect(() => readConfig({ VITE_API_BASE_URL: 'https://api.example.com' }, true)).toThrow(
      'VITE_ENTRA_TENANT_ID',
    );
  });

  it('refuses plain HTTP in a packaged build', () => {
    expect(() =>
      readConfig({ ...entra, VITE_API_BASE_URL: 'http://api.example.com' }, true),
    ).toThrow('HTTPS');
  });

  it('lets unpackaged runs override the API URL, but not packaged ones', () => {
    const env = {
      VITE_AUTH_MODE: 'dev',
      VITE_API_BASE_URL: 'https://api.example.com',
      RACESHOP_API_BASE_URL: 'http://127.0.0.1:9',
    };

    expect(readConfig(env, false).apiBaseUrl).toBe('http://127.0.0.1:9');
    expect(readConfig(env, true).apiBaseUrl).toBe('https://api.example.com');
  });

  it('keeps only the origin of the API URL', () => {
    expect(
      readConfig(
        { VITE_AUTH_MODE: 'dev', VITE_API_BASE_URL: 'http://localhost:5080/some/path' },
        false,
      ).apiBaseUrl,
    ).toBe('http://localhost:5080');
  });
});
