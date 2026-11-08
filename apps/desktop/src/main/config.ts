import type { AuthMode } from '../shared/bridge';

/**
 * Settings are baked into the build (Vite replaces import.meta.env.VITE_*), so a packaged app
 * can't be pointed elsewhere by editing files or environment variables. None of them are secrets.
 */
export interface DesktopConfig {
  authMode: AuthMode;
  apiBaseUrl: string;
  entra: { tenantId: string; clientId: string; apiScope: string } | null;
}

export function readConfig(
  env: Readonly<Record<string, unknown>>,
  isPackaged: boolean,
): DesktopConfig {
  const text = (key: string): string | undefined => {
    const value = env[key];
    return typeof value === 'string' && value !== '' ? value : undefined;
  };
  const authMode: AuthMode = text('VITE_AUTH_MODE') === 'dev' ? 'dev' : 'entra';

  // Unpackaged runs (development, e2e tests) may point at another API; packaged builds may not.
  const apiBaseUrl =
    (!isPackaged ? text('RACESHOP_API_BASE_URL') : undefined) ??
    text('VITE_API_BASE_URL') ??
    'http://localhost:5080';

  const api = new URL(apiBaseUrl);
  if (isPackaged && api.protocol !== 'https:') {
    throw new Error(`A packaged build must call the API over HTTPS, not ${api.origin}.`);
  }

  if (authMode === 'dev') {
    return { authMode, apiBaseUrl: api.origin, entra: null };
  }

  const tenantId = text('VITE_ENTRA_TENANT_ID');
  const clientId = text('VITE_ENTRA_DESKTOP_CLIENT_ID');
  const apiScope = text('VITE_API_SCOPE');
  if (!tenantId || !clientId || !apiScope) {
    throw new Error(
      'VITE_ENTRA_TENANT_ID, VITE_ENTRA_DESKTOP_CLIENT_ID and VITE_API_SCOPE must be set at build time ' +
        '(see docs/auth/entra-setup.md), or build with VITE_AUTH_MODE=dev.',
    );
  }
  return { authMode, apiBaseUrl: api.origin, entra: { tenantId, clientId, apiScope } };
}
