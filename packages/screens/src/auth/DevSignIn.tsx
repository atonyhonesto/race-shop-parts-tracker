import { useState } from 'react';
import type { SubmitEvent } from 'react';

import { Alert, Button, Select, TextField } from '@raceshop/ui';

import type { AppRole, SignedInUser } from './auth';
import { SignInLayout } from './SignInLayout';

/*
 * Development sign-in form: pick a name and a role, and the API's Dev scheme trusts the headers.
 * Apps include it only in dev builds (VITE_AUTH_MODE=dev), and the API refuses the Dev scheme
 * outside Development/Testing, so it cannot work against a deployed API even if it were shipped.
 */

const roleOptions = [
  { value: 'PartsManager', label: 'Parts manager (can install, remove, retire)' },
  { value: 'CrewChief', label: 'Crew chief (read only)' },
  { value: '', label: 'No role (to see the access-denied page)' },
];

export function DevSignIn({ onSignIn }: { onSignIn: (user: SignedInUser) => void }) {
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
