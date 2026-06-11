import { QueryClient } from '@tanstack/react-query';

/**
 * Single app-wide QueryClient, exported as a module so non-React code (the
 * auth store) can wipe it when the signed-in identity changes. Query keys are
 * tenant-agnostic (['dashboard','overview'], …), so without this wipe a user
 * switching accounts (e.g. demo École → demo Jardin d'enfants) would be served
 * the PREVIOUS tenant's cached data for up to `staleTime`.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});
