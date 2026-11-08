import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

import type { RaceShopBridge } from '../shared/bridge';

/**
 * Saves the TanStack Query cache through the bridge, so the main process stores it encrypted
 * (ADR 0008). Writes are throttled: the cache changes on every fetch, and each save means
 * IPC, DPAPI encryption and a disk write.
 */
export function createBridgePersister(
  store: RaceShopBridge['offlineCache'],
  throttleMs = 1000,
): Persister {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest: PersistedClient | undefined;

  return {
    persistClient: (client) => {
      latest = client;
      timer ??= setTimeout(() => {
        timer = undefined;
        if (latest) void store.save(JSON.stringify(latest));
      }, throttleMs);
    },
    restoreClient: async () => {
      const raw = await store.load();
      return raw ? (JSON.parse(raw) as PersistedClient) : undefined;
    },
    removeClient: async () => {
      clearTimeout(timer);
      timer = undefined;
      latest = undefined;
      await store.remove();
    },
  };
}
