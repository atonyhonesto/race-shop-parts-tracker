import { onlineManager, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { Alert, Spinner } from '@raceshop/ui';

/*
 * Offline support (ADR 0008): screens show what is cached on this device and stay read-only until
 * the connection is back. TanStack Query refetches everything on reconnect.
 */

/** True while the browser (or Electron renderer) reports a network connection. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}

const time = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

/** Time of the newest data in the cache: the last moment this device synced with the API. */
function useLastSynced(): number {
  const cache = useQueryClient().getQueryCache();
  return useSyncExternalStore(
    (onChange) => cache.subscribe(onChange),
    () => Math.max(0, ...cache.getAll().map((query) => query.state.dataUpdatedAt)),
    () => 0,
  );
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  const lastSynced = useLastSynced();
  if (online) return null;

  return (
    <Alert tone="warning" title="You're offline">
      {lastSynced > 0
        ? `Showing data saved on this device, last synced ${time.format(lastSynced)}. `
        : 'Nothing is saved on this device yet. '}
      Install, remove and retire are turned off until you reconnect, so the life-limit and one-car
      rules are always checked against current data.
    </Alert>
  );
}

/**
 * What to show while a query has no data: a spinner, or, when the query is paused because the
 * device is offline, an explanation instead of an endless spinner.
 */
export function PendingState({ query, label }: { query: UseQueryResult; label: string }) {
  if (query.fetchStatus === 'paused') {
    return (
      <Alert tone="info" title="Not available offline">
        This page wasn't saved on this device before the connection dropped. It will load when
        you're back online.
      </Alert>
    );
  }
  return <Spinner label={`Loading ${label}`} />;
}
