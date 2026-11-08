import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { AuthContext, DevSignIn } from '@raceshop/screens';
import type { Auth, SignedInUser } from '@raceshop/screens';

/*
 * Web development sign-in. Only bundled when VITE_AUTH_MODE=dev (see main.tsx).
 * The chosen user lives in sessionStorage and is sent as the API's Dev scheme headers.
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
