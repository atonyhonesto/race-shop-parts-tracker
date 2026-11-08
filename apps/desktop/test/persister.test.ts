import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBridgePersister } from '../src/renderer/persister';

const snapshot = (n: number) =>
  ({ timestamp: n, buster: '1', clientState: { queries: [], mutations: [] } }) as PersistedClient;

function fakeStore(initial: string | null = null) {
  let value = initial;
  return {
    save: vi.fn((next: string) => {
      value = next;
      return Promise.resolve();
    }),
    load: vi.fn(() => Promise.resolve(value)),
    remove: vi.fn(() => {
      value = null;
      return Promise.resolve();
    }),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('createBridgePersister', () => {
  it('batches rapid cache changes into one encrypted write with the latest state', () => {
    const store = fakeStore();
    const persister = createBridgePersister(store, 1000);

    void persister.persistClient(snapshot(1));
    void persister.persistClient(snapshot(2));
    void persister.persistClient(snapshot(3));
    expect(store.save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(store.save).toHaveBeenCalledOnce();
    expect(JSON.parse(store.save.mock.calls[0]?.[0] ?? '{}')).toMatchObject({ timestamp: 3 });
  });

  it('restores what was saved', async () => {
    const persister = createBridgePersister(fakeStore(JSON.stringify(snapshot(7))));

    expect(await persister.restoreClient()).toMatchObject({ timestamp: 7 });
  });

  it('cancels a pending write when the cache is removed (sign-out)', async () => {
    const store = fakeStore();
    const persister = createBridgePersister(store, 1000);

    void persister.persistClient(snapshot(1));
    await persister.removeClient();
    vi.advanceTimersByTime(1000);

    expect(store.save).not.toHaveBeenCalled();
    expect(store.remove).toHaveBeenCalledOnce();
  });
});
