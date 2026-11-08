import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { AuthContext, DevSignIn, SignInLayout } from '@raceshop/screens';
import type { Auth, SignedInUser } from '@raceshop/screens';
import { Alert, Button, Spinner } from '@raceshop/ui';

type State =
  | { status: 'loading' }
  | { status: 'signed-out'; error?: string }
  | { status: 'signing-in' }
  | { status: 'signed-in'; user: SignedInUser };

/**
 * Desktop sign-in. The main process owns sign-in and tokens; this component only asks it who is
 * signed in and shows the sign-in screen. API calls need no headers here: the main process adds
 * them when it forwards /api requests (ADR 0009).
 */
export function DesktopAuthProvider({ children }: { children: ReactNode }) {
  const bridge = window.raceshop;
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    bridge.auth
      .getUser()
      .then((user) => {
        setState(user ? { status: 'signed-in', user } : { status: 'signed-out' });
      })
      .catch(() => {
        setState({ status: 'signed-out' });
      });
  }, [bridge]);

  const auth = useMemo<Auth | null>(() => {
    if (state.status !== 'signed-in') return null;
    return {
      mode: bridge.authMode,
      user: state.user,
      signOut: () => {
        void bridge.auth.signOut().then(() => {
          queryClient.clear();
          setState({ status: 'signed-out' });
        });
      },
      getRequestHeaders: () => Promise.resolve({}),
    };
  }, [state, bridge, queryClient]);

  function signIn(devUser?: SignedInUser) {
    setState({ status: 'signing-in' });
    bridge.auth
      .signIn(devUser)
      .then((user) => {
        setState({ status: 'signed-in', user });
      })
      .catch((error: unknown) => {
        setState({
          status: 'signed-out',
          error: error instanceof Error ? error.message : 'Sign-in failed.',
        });
      });
  }

  if (auth) return <AuthContext value={auth}>{children}</AuthContext>;

  if (state.status === 'loading' || state.status === 'signing-in') {
    return (
      <SignInLayout>
        <Spinner
          label={state.status === 'signing-in' ? 'Waiting for sign-in in your browser' : 'Loading'}
        />
        {state.status === 'signing-in' && bridge.authMode === 'entra' && (
          <p>Finish signing in in the browser window that opened, then come back here.</p>
        )}
      </SignInLayout>
    );
  }

  if (bridge.authMode === 'dev') {
    return <DevSignIn onSignIn={signIn} />;
  }

  return (
    <SignInLayout>
      {state.status === 'signed-out' && state.error && (
        <Alert tone="danger" title="Sign-in failed">
          {state.error}
        </Alert>
      )}
      <p>Sign in with your team Microsoft account. Your browser will open to complete sign-in.</p>
      <Button
        variant="primary"
        onClick={() => {
          signIn();
        }}
      >
        Sign in with Microsoft
      </Button>
    </SignInLayout>
  );
}
