# 0008. Offline: a read-only, encrypted copy of what was viewed

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

The desktop app is used in garages, at test tracks and in transporters, where the connection comes
and goes. Crews need to look up a part's life status and which car it is on even with no signal.

The rules that matter most need **current** server data:

- A part can be on only one car.
- A part at 100% of its life is blocked.

If two laptops each installed the same rotor while offline, both would succeed locally, and one
would be wrong on the car.

The data is also company inventory on a shared PC, so whatever is kept offline must not be readable
by another Windows user or anyone who copies the disk.

## Decision

- **Offline is read-only.** Parts lists, part details and serialized parts the user has already
  viewed stay available. Install, remove and retire are disabled until the connection returns, with
  a visible reason. The server's rules are never bypassed or replayed late.
- **The cache is the TanStack Query cache, persisted** (`@tanstack/react-query-persist-client`)
  through a custom persister:
  - **Storage:** the main process encrypts the cache with Electron `safeStorage` (Windows DPAPI,
    tied to the Windows user) and writes it to the app's data folder. No extra storage library.
  - **Write rate:** saves are throttled to at most once a second.
  - **Expiry:** kept for 7 days, and discarded when the app version changes, because response
    shapes may differ.
  - **Sign-out:** deletes it, so the next person on the PC starts clean.
- **Sync on reconnect:** TanStack Query refetches active queries when the connection comes back. At
  startup the app reads `navigator.onLine`, because TanStack Query otherwise assumes it starts online.
- **Same screens on both apps.** The offline banner, "not available offline" state and disabled
  actions live in `packages/screens`, so the web app behaves the same way when its tab loses the
  network.

## Consequences

- **Easier:**
  - Crews can check life status with no signal.
  - There is no conflict resolution to design, test or explain, because the server stays the only
    place a change happens.
- **Harder:**
  - Only what was viewed is offline. A part nobody opened beforehand shows "Not available offline".
    An explicit "download all parts for offline" could come later, but it would need a sync endpoint
    (deltas since a timestamp) to stay cheap at 100k parts.
  - Up to 7 days stale. The banner shows "last synced" so nobody mistakes cached data for current.
- **If encryption is unavailable** (rare on Windows, possible on Linux without a keyring), nothing is
  written to disk. The app still works, just without an offline copy.

## Alternatives considered

- **Queue changes offline and replay on reconnect.** Faster for the user, but a replayed install can
  fail with 409 hours later, after the car has gone out. The safety rules exist to prevent exactly
  that.
- **A local database (SQLite) with full two-way sync.** It is the right tool for an offline-first
  app with offline edits. Here it would duplicate the domain rules on the client and bring a native
  module into Electron.
- **IndexedDB in the renderer.** Simple, but stored unencrypted in the profile folder, and readable
  by anything that can read the user's files.
