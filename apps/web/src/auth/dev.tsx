import { useMemo, useState } from 'react';
import type { ReactNode, SubmitEvent } from 'react';

import { Alert, Button, Select, TextField } from '@raceshop/ui';

import { AuthContext } from './auth';
import type { AppRole, Auth, SignedInUser } from './auth';
import { SignInLayout } from './SignInLayout';

/*
 * Development sign-in: pick a name and a role, and the API's Dev scheme trusts the headers.
 * Only bundled when VITE_AUTH_MODE=dev (see main.tsx), and the API refuses the Dev scheme outside
 * Development/Testing, so this cannot work against a deployed API even if it were shipped.
 */

const STORAGE_KEY = 'raceshop.devUser';

function readStoredUser(): SignedInUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SignedInUser) : null;
  } catch {
    return null;
  }
}

const roleOptions = [
  { value: 'PartsManager', label: 'Parts manager (can install, remove, retire)' },
  { value: 'CrewChief', label: 'Crew chief (read only)' },
  { value: '', label: 'No role (to see the access-denied page)' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SignedInUser | null>(readStoredUser);

  const auth = useMemo<Auth | null>(() => {
    if (!user) return null;
    return {
      mode: 'dev',
      user,
      signOut: () => {
        sessionStorage.removeItem(STORAGE_KEY);
        setUser(null);
      },
      getRequestHeaders: () =>
        Promise.resolve({ 'X-Dev-User': user.name, 'X-Dev-Roles': user.roles.join(',') }),
    };
  }, [user]);

  if (!auth) {
    return (
      <DevSignIn
        onSignIn={(signedIn) => {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(signedIn));
          setUser(signedIn);
        }}
      />
    );
  }

  return <AuthContext value={auth}>{children}</AuthContext>;
}

function DevSignIn({ onSignIn }: { onSignIn: (user: SignedInUser) => void }) {
  const [name, setName] = useState('alex');
  const [role, setRole] = useState<AppRole | ''>('PartsManager');

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSignIn({ name: name.trim() || 'dev-user', roles: role ? [role] : [] });
  }

  return (
    <SignInLayout>
      <Alert tone="info" title="Development sign-in">
        No Entra ID tenant needed. The API accepts this only when it runs in Development.
      </Alert>
      <form onSubmit={submit} aria-label="Development sign-in">
        <TextField
          label="Name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          autoComplete="off"
        />
        <Select
          label="Role"
          options={roleOptions}
          value={role}
          onChange={(event) => {
            setRole(event.target.value as AppRole | '');
          }}
        />
        <Button type="submit" variant="primary">
          Sign in
        </Button>
      </form>
    </SignInLayout>
  );
}
