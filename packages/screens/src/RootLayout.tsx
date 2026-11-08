import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';

import { AppShell, Button, ThemeToggle } from '@raceshop/ui';

import { hasAnyRole, useAuth } from './auth/auth';
import styles from './app.module.css';
import { OfflineBanner } from './offline/offline';
import { NoAccessPage } from './pages/StatusPages';

export function RootLayout() {
  const { user, signOut } = useAuth();
  useFocusMainOnNavigation();

  return (
    <AppShell
      appName="Race Shop Parts Tracker"
      navItems={[
        <NavLink key="parts" to="/parts">
          Parts
        </NavLink>,
        <NavLink key="cars" to="/cars">
          Cars
        </NavLink>,
      ]}
      actions={
        <>
          <span className={styles.user}>
            {user.name}
            {user.roles.length > 0 && ` (${user.roles.join(', ')})`}
          </span>
          <ThemeToggle />
          <Button onClick={signOut}>Sign out</Button>
        </>
      }
    >
      <OfflineBanner />
      {hasAnyRole(user) ? <Outlet /> : <NoAccessPage />}
    </AppShell>
  );
}

/**
 * In a single-page app the browser doesn't announce a new page. Moving focus to <main> after each
 * client-side navigation puts screen reader and keyboard users at the start of the new content
 * (WCAG 2.4.3). The first page load is left alone so the browser's default behaviour applies.
 */
function useFocusMainOnNavigation() {
  const { pathname } = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById('main')?.focus();
  }, [pathname]);
}
