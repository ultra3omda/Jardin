'use client';

import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export interface UseResourceResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Token-gated read hook. A resource is fetched only once the store is hydrated
 * and an access token exists. It never falls back to demo data — callers render
 * explicit loading / error / empty states from the returned flags.
 */
export function useResource<T>(
  key: QueryKey,
  fetcher: (token: string) => Promise<T>,
  options?: { enabled?: boolean },
): UseResourceResult<T> {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const enabled = (options?.enabled ?? true) && isHydrated && !!accessToken;

  const query = useQuery<T>({
    queryKey: key,
    queryFn: () => fetcher(accessToken as string),
    enabled,
  });

  return {
    data: query.data,
    isLoading: !isHydrated || (enabled && query.isPending),
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
