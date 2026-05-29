/**
 * Narrows a possibly-absent access token to a non-empty string, or throws a
 * user-facing error. Use inside TanStack Query `mutationFn`s so a missing/expired
 * token surfaces as an `onError` toast ("Session expirée…") instead of silently
 * sending `Authorization: Bearer null` and getting an opaque 401.
 */
export function requireToken(token: string | null | undefined): string {
  if (!token) {
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }
  return token;
}
