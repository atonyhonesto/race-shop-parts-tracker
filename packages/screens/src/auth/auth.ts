import { createContext, use } from 'react';

/** App roles from the API's Entra ID registration (ADR 0004). */
export type AppRole = 'CrewChief' | 'PartsManager';

export interface SignedInUser {
  name: string;
  roles: readonly AppRole[];
}

/**
 * What the rest of the app knows about sign-in. Two implementations:
 * Entra ID via MSAL (./entra.tsx) and the local Dev scheme (./dev.tsx).
 */
export interface Auth {
  mode: 'entra' | 'dev';
  user: SignedInUser;
  signOut: () => void;
  /** Headers that authenticate an API request (a bearer token, or the Dev scheme headers). */
  getRequestHeaders: () => Promise<Record<string, string>>;
}

export const AuthContext = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside an auth provider.');
  return auth;
}

/**
 * UI hint only: hides actions the API would refuse anyway. The API enforces the same rule
 * with the ManageInventory policy, so this never replaces server-side authorization.
 */
export function canManageInventory(user: SignedInUser): boolean {
  return user.roles.includes('PartsManager');
}

export function hasAnyRole(user: SignedInUser): boolean {
  return user.roles.length > 0;
}

const knownRoles: readonly string[] = ['CrewChief', 'PartsManager'] satisfies AppRole[];

export function toAppRoles(values: readonly unknown[]): AppRole[] {
  return values.filter(
    (value): value is AppRole => typeof value === 'string' && knownRoles.includes(value),
  );
}
