import { ApiError } from '../api/client';

/**
 * API error code returned by POST /api/auth/login when the submitted email
 * matches users in more than one tenant. The response body also carries
 * `availableTenantSlugs` so the client can let the user pick an establishment.
 * Keep in sync with apps/api/src/auth/auth.service.ts.
 */
export const TENANT_SLUG_REQUIRED = 'TENANT_SLUG_REQUIRED';

export type LoginErrorResult =
  | { type: 'tenant-required'; slugs: string[] }
  | { type: 'invalid-credentials' }
  | { type: 'generic' };

/**
 * Maps a failed login() call to the next UI action. Pure (no React) so the
 * branching is fully unit-testable:
 *  - multi-tenant email  → 'tenant-required' (show the establishment picker)
 *  - wrong email/password → 'invalid-credentials'
 *  - anything else        → 'generic'
 */
export function interpretLoginError(err: unknown): LoginErrorResult {
  if (err instanceof ApiError) {
    if (err.code === TENANT_SLUG_REQUIRED) {
      const raw = err.details?.availableTenantSlugs;
      const slugs = Array.isArray(raw) ? (raw.filter((s): s is string => typeof s === 'string')) : [];
      return { type: 'tenant-required', slugs };
    }
    if (err.status === 401) {
      return { type: 'invalid-credentials' };
    }
  }
  return { type: 'generic' };
}
