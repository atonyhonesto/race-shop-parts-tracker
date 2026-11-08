import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-node';
import type { AccountInfo, ICachePlugin } from '@azure/msal-node';

import type { BridgeUser } from '../shared/bridge';
import type { DesktopConfig } from './config';
import type { EncryptedFile } from './encryptedFile';

/** Sign-in as seen by the rest of the main process. */
export interface AuthService {
  getUser: () => Promise<BridgeUser | null>;
  signIn: (devUser?: BridgeUser) => Promise<BridgeUser>;
  signOut: () => Promise<void>;
  /** Credentials for one API call; null when nobody is signed in. */
  getRequestHeaders: () => Promise<Record<string, string> | null>;
}

const KNOWN_ROLES = ['CrewChief', 'PartsManager'] as const;

export function rolesFromAccessToken(token: string): BridgeUser['roles'] {
  const payload = token.split('.')[1];
  if (!payload) return [];
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    roles?: unknown;
  };
  return Array.isArray(claims.roles)
    ? KNOWN_ROLES.filter((role) => (claims.roles as unknown[]).includes(role))
    : [];
}

/** Development: the user picked in the dev sign-in form, sent as the API's Dev scheme headers. */
export function createDevAuth(): AuthService {
  let user: BridgeUser | null = null;
  return {
    getUser: () => Promise.resolve(user),
    signIn: (devUser) => {
      if (!devUser) throw new Error('Dev sign-in needs a user.');
      user = {
        name: devUser.name,
        roles: devUser.roles.filter((role) => KNOWN_ROLES.includes(role)),
      };
      return Promise.resolve(user);
    },
    signOut: () => {
      user = null;
      return Promise.resolve();
    },
    getRequestHeaders: () =>
      Promise.resolve(
        user ? { 'X-Dev-User': user.name, 'X-Dev-Roles': user.roles.join(',') } : null,
      ),
  };
}

/** MSAL token cache persisted through an encrypted file (Windows DPAPI via safeStorage). */
export function encryptedCachePlugin(file: EncryptedFile): ICachePlugin {
  return {
    beforeCacheAccess: async (context) => {
      const cached = await file.read();
      if (cached) context.tokenCache.deserialize(cached);
    },
    afterCacheAccess: async (context) => {
      if (context.cacheHasChanged) await file.write(context.tokenCache.serialize());
    },
  };
}

const SIGN_IN_PAGE = (message: string) =>
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>Race Shop Parts Tracker</title>` +
  `<body style="font-family:system-ui;padding:2rem"><h1>${message}</h1>` +
  `<p>You can close this tab and return to Race Shop Parts Tracker.</p></body></html>`;

/**
 * Entra ID sign-in, following Microsoft's guidance for desktop apps: the system browser opens the
 * sign-in page and returns to a loopback redirect (http://localhost:<port>) with PKCE.
 * Tokens stay in this process; the renderer only learns the user's name and roles.
 */
export function createEntraAuth(
  entra: NonNullable<DesktopConfig['entra']>,
  tokenCache: EncryptedFile,
  lastUser: EncryptedFile,
  openExternal: (url: string) => Promise<void>,
): AuthService {
  const msal = new PublicClientApplication({
    auth: {
      clientId: entra.clientId,
      authority: `https://login.microsoftonline.com/${entra.tenantId}`,
    },
    cache: { cachePlugin: encryptedCachePlugin(tokenCache) },
  });
  const scopes = [entra.apiScope];

  async function account(): Promise<AccountInfo | null> {
    return (await msal.getAllAccounts())[0] ?? null;
  }

  async function remember(user: BridgeUser): Promise<BridgeUser> {
    await lastUser.write(JSON.stringify(user));
    return user;
  }

  return {
    async getUser() {
      const current = await account();
      if (!current) return null;
      try {
        const result = await msal.acquireTokenSilent({ account: current, scopes });
        return await remember({
          name: current.name ?? current.username,
          roles: rolesFromAccessToken(result.accessToken),
        });
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) return null;
        // Offline: fall back to the roles seen at the last successful sign-in, for read-only use.
        const cached = await lastUser.read();
        return cached ? (JSON.parse(cached) as BridgeUser) : null;
      }
    },

    async signIn() {
      const result = await msal.acquireTokenInteractive({
        scopes,
        openBrowser: async (url) => {
          if (!url.startsWith('https://login.microsoftonline.com/')) {
            throw new Error('Refusing to open an unexpected sign-in URL.');
          }
          await openExternal(url);
        },
        successTemplate: SIGN_IN_PAGE('Signed in'),
        errorTemplate: SIGN_IN_PAGE('Sign-in failed'),
      });
      const signedIn = result.account;
      if (!signedIn) throw new Error('Sign-in returned no account.');
      return remember({
        name: signedIn.name ?? signedIn.username,
        roles: rolesFromAccessToken(result.accessToken),
      });
    },

    async signOut() {
      const current = await account();
      if (current) await msal.getTokenCache().removeAccount(current);
      await Promise.all([tokenCache.remove(), lastUser.remove()]);
    },

    async getRequestHeaders() {
      const current = await account();
      if (!current) return null;
      const result = await msal.acquireTokenSilent({ account: current, scopes });
      return { Authorization: `Bearer ${result.accessToken}` };
    },
  };
}
