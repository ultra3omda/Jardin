/**
 * V1.7-A — CORS origin matcher for tenant subdomains.
 *
 * Accepts the static allowlist (KLASSO_KNOWN_ORIGINS + CORS_ORIGIN env, built
 * by `buildCorsOrigins()` in configuration.ts) OR any `https://<label>.klasso.tn`
 * subdomain. The wildcard is deliberately narrow: https only, exactly one DNS
 * label, no nested sub-subdomains, no arbitrary suffix — so it can never match
 * `evil.com` or `klasso.tn.attacker.com`.
 *
 * Tenant isolation is NEVER derived from the Origin/Host (invariant D3). This
 * matcher only decides whether the browser may READ the CORS response; the JWT
 * `tenantId` claim remains the sole source of data scoping.
 */
export const KLASSO_SUBDOMAIN_RE =
  /^https:\/\/[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.klasso\.tn$/;

export function isAllowedOrigin(
  origin: string | undefined,
  allowlist: string[],
): boolean {
  if (!origin) return true; // same-origin / server-to-server / curl
  if (allowlist.includes(origin)) return true; // KLASSO_KNOWN_ORIGINS + CORS_ORIGIN
  return KLASSO_SUBDOMAIN_RE.test(origin); // <slug>.klasso.tn
}
