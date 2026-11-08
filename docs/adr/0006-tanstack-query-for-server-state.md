# 0006. Use TanStack Query for server state

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

Almost all of the state in this app is a copy of data that lives on the server: parts, serialized
parts, cars, install status. Very little is client-only: the theme choice, an open dialog, a form
draft. The server data has the usual problems:

- **Loading and errors.** Every screen needs a loading state and an error state, and errors carry
  the API's problem details.
- **Caching.** Back/forward and revisiting a part should be instant.
- **Retries.** Azure SQL's free tier auto-pauses, and the first request after a pause can fail or
  stall while it resumes.
- **Invalidation.** After an install, the part's status, its car, and the stock counts on the
  search page are all stale.
- **Pagination.** Changing page should not blank the table.

## Decision

All server state goes through **TanStack Query**:

- **One hook per resource:** `usePartsSearch`, `usePart`, `useSerializedPart`, `useCars`. Each is
  built on the generated client (ADR 0005), under a query key hierarchy (`inventoryKeys`).
- **One mutation per command:** `useInstallPart`, `useRemovePart`, `useRetirePart`. A successful
  change invalidates `['inventory']`, so every screen that shows inventory refetches. We accept a
  few extra requests in exchange for never showing a stale count.
- **Defaults:**
  - 30 s stale time
  - retry network failures and 5xx up to 3 times (covers SQL auto-pause), never 4xx
  - `keepPreviousData` when paging
- **Errors** become `ApiError` with the problem-details body, so screens show the API's message,
  the stable `code` and the `traceId`.
- **Client-only state** stays in React (`useState`, URL search params for search and page). There
  is no global client store.

## Consequences

- **Easier:**
  - Screens read like the data they show: `const part = usePart(id)`, then render pending, error or
    data.
  - Caching, de-duplication, cancellation on unmount (`signal`), and focus and reconnect refetching
    come built in.
  - Phase 4 can persist the query cache for the Electron offline list instead of building a second
    sync layer.
- **Harder:**
  - Contributors need to understand query keys and invalidation, which is a real learning curve
    for anyone used to Redux.
  - Broad invalidation refetches more than strictly needed. Phase 6 can narrow it if profiling
    shows a cost.

## Alternatives considered

- **Redux Toolkit with RTK Query.** It has comparable caching, but brings Redux's store, slices and
  provider. That pays off when there is a lot of client state shared across screens, which we don't
  have. Without RTK Query, plain Redux would mean hand-writing loading flags, caching and
  invalidation.
- **Zustand.** A good fit for small client-side stores, but it is not a server-cache library: no
  request de-duplication, retries, background refresh or invalidation. We would rebuild TanStack
  Query on top of it.
- **React Router loaders and actions.** They fetch per route and revalidate after actions. But the
  cache is tied to navigation, there is no shared cache across components, and the same screens
  must also run in Electron, where routing and offline needs differ.
- **Plain `useEffect` + `fetch`.** Fine for one call. For this app it means race conditions on
  fast navigation, no cache, and hand-written retry logic on every screen.
