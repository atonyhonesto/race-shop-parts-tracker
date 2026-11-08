import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Alert, Spinner } from '@raceshop/ui';

import { ApiError } from '../api/inventory';
import styles from '../app.module.css';
import { usePageTitle } from '../usePageTitle';

export function PageLoading() {
  return <Spinner label="Loading page" />;
}

/** Inline error for a failed query: shows the API's explanation and the trace ID for support. */
export function QueryError({ error, what }: { error: Error; what: string }) {
  const traceId = error instanceof ApiError ? error.problem?.traceId : undefined;
  return (
    <Alert tone="danger" title={`Could not load ${what}`}>
      <p>{error.message}</p>
      {traceId && <p className={styles.muted}>Trace ID for support: {traceId}</p>}
    </Alert>
  );
}

export function NotFoundPage() {
  usePageTitle('Not found');
  return (
    <div className={styles.page}>
      <h1>Page not found</h1>
      <p>
        <Link to="/parts">Go to parts</Link>
      </p>
    </div>
  );
}

export function NoAccessPage() {
  usePageTitle('No access');
  return (
    <div className={styles.page}>
      <h1>No access</h1>
      <p>
        You are signed in, but you have no role in this app. Ask an administrator to assign you Crew
        chief or Parts manager.
      </p>
    </div>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  usePageTitle('Error');
  const message = isRouteErrorResponse(error)
    ? `${String(error.status)} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unexpected error.';
  return (
    <main id="main" className={styles.signIn}>
      <h1>Something went wrong</h1>
      <Alert tone="danger" title="The page could not be shown">
        {message}
      </Alert>
      <p>
        <a href="/parts">Reload the app</a>
      </p>
    </main>
  );
}
