import type { ReactNode } from 'react';

import styles from './Layout.module.css';

export interface AppShellProps {
  appName: string;
  /** Navigation links (router-agnostic). Each becomes a list item. Mark the active one with aria-current="page". */
  navItems: readonly ReactNode[];
  /** Right side of the header: user menu, theme toggle. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Page frame shared by the web and desktop apps: skip link, header with navigation, and a
 * focusable <main> that route changes can move focus to (WCAG 2.4.1, 2.4.3).
 */
export function AppShell({ appName, navItems, actions, children }: AppShellProps) {
  return (
    <>
      <a className={styles.skipLink} href="#main">
        Skip to main content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <p className={styles.brand}>{appName}</p>
          <nav className={styles.nav} aria-label="Main">
            <ul>
              {navItems.map((item, index) => (
                // Nav items are a fixed, ordered list, so the index is a stable key.
                <li key={index}>{item}</li>
              ))}
            </ul>
          </nav>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
