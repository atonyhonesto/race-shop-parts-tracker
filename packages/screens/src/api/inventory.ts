import {
  getPart,
  getSerializedPart,
  installPart,
  listCars,
  removePart,
  retirePart,
  searchParts,
} from '@raceshop/api-client';
import type { ApiProblem } from '@raceshop/api-client';
import {
  keepPreviousData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuth } from '../auth/auth';

/*
 * All server state goes through TanStack Query (ADR 0006): caching, de-duplication, retries,
 * background refresh and cache invalidation after a change. Components never call fetch directly.
 */

export const PAGE_SIZE = 25;

/** An API failure with the problem-details body, so screens can show `detail` and switch on `code`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ApiProblem | undefined,
  ) {
    super(problem?.detail ?? problem?.title ?? `Request failed (${status}).`);
    this.name = 'ApiError';
  }

  get code(): string | undefined {
    return this.problem?.code;
  }
}

/** The SDK's result shape: a body or an error body, plus the raw response when there was one. */
type SdkResult<T> = ({ data: T; error: undefined } | { data: undefined; error: unknown }) & {
  response?: Response;
};

/** Turns the SDK's result into a value or a thrown ApiError. Network failures reject as-is. */
async function unwrap<R extends SdkResult<unknown>>(
  request: Promise<R>,
): Promise<Exclude<R['data'], undefined>> {
  const result = await request;
  if (result.error !== undefined || !result.response?.ok) {
    throw new ApiError(result.response?.status ?? 0, result.error as ApiProblem | undefined);
  }
  return result.data as Exclude<R['data'], undefined>;
}

/**
 * @param gcTime How long unused data stays in memory. The desktop app raises it to match how long
 *   its offline cache is kept, because persisted queries are restored only while still in the cache.
 */
export function createQueryClient({ gcTime }: { gcTime?: number } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        ...(gcTime === undefined ? {} : { gcTime }),
        // Retry network blips and 5xx (e.g. Azure SQL resuming from auto-pause), never 4xx.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 3,
      },
    },
  });
}

export const inventoryKeys = {
  all: ['inventory'] as const,
  parts: (search: string, page: number) =>
    [...inventoryKeys.all, 'parts', { search, page }] as const,
  part: (id: string) => [...inventoryKeys.all, 'part', id] as const,
  serializedPart: (id: string) => [...inventoryKeys.all, 'serialized-part', id] as const,
  cars: () => [...inventoryKeys.all, 'cars'] as const,
};

export function usePartsSearch(search: string, page: number) {
  const { getRequestHeaders } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.parts(search, page),
    queryFn: async ({ signal }) =>
      unwrap(
        searchParts({
          query: { page, pageSize: PAGE_SIZE, ...(search ? { search } : {}) },
          headers: await getRequestHeaders(),
          signal,
        }),
      ),
    // Keep the current page on screen while the next one loads (no flash of empty table).
    placeholderData: keepPreviousData,
  });
}

export function usePart(id: string) {
  const { getRequestHeaders } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.part(id),
    queryFn: async ({ signal }) =>
      unwrap(getPart({ path: { id }, headers: await getRequestHeaders(), signal })),
  });
}

export function useSerializedPart(id: string) {
  const { getRequestHeaders } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.serializedPart(id),
    queryFn: async ({ signal }) =>
      unwrap(getSerializedPart({ path: { id }, headers: await getRequestHeaders(), signal })),
  });
}

export function useCars() {
  const { getRequestHeaders } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.cars(),
    queryFn: async ({ signal }) => unwrap(listCars({ headers: await getRequestHeaders(), signal })),
    staleTime: 5 * 60_000, // cars rarely change
  });
}

/** After any change, everything inventory-related may be stale (counts, status, current car). */
function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
}

export function useInstallPart(serializedPartId: string) {
  const { getRequestHeaders } = useAuth();
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async (carId: string) =>
      unwrap(
        installPart({
          path: { id: serializedPartId },
          body: { carId },
          headers: await getRequestHeaders(),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useRemovePart(serializedPartId: string) {
  const { getRequestHeaders } = useAuth();
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async (usageSinceInstall: number) =>
      unwrap(
        removePart({
          path: { id: serializedPartId },
          body: { usageSinceInstall },
          headers: await getRequestHeaders(),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useRetirePart(serializedPartId: string) {
  const { getRequestHeaders } = useAuth();
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async () =>
      unwrap(retirePart({ path: { id: serializedPartId }, headers: await getRequestHeaders() })),
    onSuccess: invalidate,
  });
}
