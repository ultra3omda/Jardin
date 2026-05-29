import { extractTenantSlugFromHost } from '@/lib/tenant/extract-tenant-slug';

export interface SlugConsistencyInput {
  host: string;
  /** `tenant.slug` from the JWT-backed session (/auth/me). */
  jwtSlug: string | undefined;
  enabled: boolean;
  baseDomain: string;
}

/**
 * UX guard (NOT an isolation control). On a tenant subdomain, if the host slug
 * disagrees with the session's tenant slug, the branded shell would mislead the
 * user. Returns true → caller should log out and redirect to the correct host.
 * Real isolation is always enforced by the JWT `tenantId` (D3), so bypassing
 * this guard leaks nothing — it only protects against a confusing shell.
 */
export function shouldRedirectForSlugMismatch(
  input: SlugConsistencyInput,
): boolean {
  if (!input.enabled) return false;
  if (!input.jwtSlug) return false;
  const hostSlug = extractTenantSlugFromHost(input.host, input.baseDomain);
  if (!hostSlug) return false; // apex / preview → path mode, nothing to compare
  return hostSlug !== input.jwtSlug;
}
