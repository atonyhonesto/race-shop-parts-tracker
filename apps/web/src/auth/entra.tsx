import {
  InteractionRequiredAuthError,
  InteractionStatus,
  PublicClientApplication,
} from '@azure/msal-browser';
import type { AccountInfo } from '@azure/msal-browser';
import { MsalProvider, useMsal } from '@azure/msal-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { Alert, Button, Spinner } from '@raceshop/ui';

import { AuthContext, SignInLayout, toAppRoles } from '@raceshop/screens';
import type { AppRole, Auth } from '@raceshop/screens';

/*
 * Microsoft Entra ID sign-in with MSAL (authorization code flow with PKCE, redirect-based).
 * Tokens live in sessionStorage: they are cleared when the tab closes and never shared across tabs.
 */

function requiredEnv(
  name: 'VITE_ENTRA_TENANT_ID' | 'VITE_ENTRA_CLIENT_ID' | 'VITE_API_SCOPE',
): string {
  const value = import.meta.env[name];
  if (!value)
    throw new Error(`${name} is not set. See apps/web/.env.example and docs/auth/entra-setup.md.`);
  return value;
}

const apiScope = requiredEnv('VITE_API_SCOPE');

const msal = new PublicClientApplication({
  auth: {
    clientId: requiredEnv('VITE_ENTRA_CLIENT_ID'),
    authority: `https://login.microsoftonline.com/${requiredEnv('VITE_ENTRA_TENANT_ID')}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'sessionStorage' },
});

// Finish a redirect sign-in (if this page load is the return trip) before the first render.
await msal.initialize();
const redirectResult = await msal.handleRedirectPromise();
const initialAccount = redirectResult?.account ?? msal.getAllAccounts()[0];
if (initialAccount) msal.setActiveAccount(initialAccount);

async function getAccessToken(account: AccountInfo): Promise<string> {
  try {
    return (await msal.acquireTokenSilent({ scopes: [apiScope], account })).accessToken;
  } catch (error) {
    // Expired session, new consent or MFA required: go back through Entra ID.
    if (error instanceof InteractionRequiredAuthError) {
      await msal.acquireTokenRedirect({ scopes: [apiScope], account });
    }
    throw error;
  }
}

/** Reads app roles from the access token, for UI hints only. The API validates the token itself. */
function rolesFromToken(token: string): AppRole[] {
  const payload = token.split('.')[1];
  if (!payload) return [];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  const claims = JSON.parse(json) as { roles?: unknown };
  return Array.isArray(claims.roles) ? toAppRoles(claims.roles) : [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msal}>
      <EntraGate>{children}</EntraGate>
    </MsalProvider>
  );
}

function EntraGate({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const account = instance.getActiveAccount() ?? accounts[0] ?? null;
  const [roles, setRoles] = useState<{ account: string; roles: AppRole[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    getAccessToken(account)
      .then((token) => {
        if (!cancelled) setRoles({ account: account.homeAccountId, roles: rolesFromToken(token) });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  const auth = useMemo<Auth | null>(() => {
    if (!account || roles?.account !== account.homeAccountId) return null;
    return {
      mode: 'entra',
      user: { name: account.name ?? account.username, roles: roles.roles },
      signOut: () => void instance.logoutRedirect({ account }),
      getRequestHeaders: async () => ({ Authorization: `Bearer ${await getAccessToken(account)}` }),
    };
  }, [account, roles, instance]);

  if (error) {
    return (
      <SignInLayout>
        <Alert tone="danger" title="Sign-in failed">
          {error}
        </Alert>
      </SignInLayout>
    );
  }

  if (!account) {
    return (
      <SignInLayout>
        <p>Sign in with your team Microsoft account.</p>
        <Button
          variant="primary"
          disabled={inProgress !== InteractionStatus.None}
          onClick={() => void instance.loginRedirect({ scopes: [apiScope] })}
        >
          Sign in with Microsoft
        </Button>
      </SignInLayout>
    );
  }

  if (!auth) {
    return (
      <SignInLayout>
        <Spinner label="Signing in" />
      </SignInLayout>
    );
  }

  return <AuthContext value={auth}>{children}</AuthContext>;
}
