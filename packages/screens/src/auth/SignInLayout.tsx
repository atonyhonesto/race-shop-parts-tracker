import type { ReactNode } from 'react';

import styles from '../app.module.css';

/** Standalone page for signing in (no app navigation until there is a user). */
export function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className={styles.signIn}>
      <h1>Race Shop Parts Tracker</h1>
      {children}
    </main>
  );
}
