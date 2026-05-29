/**
 * A tenant slug as a strict DNS label (lowercase alnum + internal hyphens),
 * matching the server-side slug contract. In subdomain mode the slug occupies
 * the host position, so a malformed value could escape the origin (open
 * redirect); `buildTenantUrl` validates against this and falls back to the
 * origin-safe path mode otherwise. Defence-in-depth — the API also enforces
 * slug format at write time.
 */
const SAFE_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Canonical URL for a tenant, per the active routing mode.
 *
 * - Subdomain mode (NEXT_PUBLIC_ENABLE_SUBDOMAIN=true + NEXT_PUBLIC_BASE_DOMAIN
 *   set + valid slug): `https://<slug>.<base><path>`.
 * - Path mode (default / preview / apex / invalid slug): `<web-url>/t/<slug><path>`.
 *
 * Used for post-login redirects and cross-tenant links. The API's outbound
 * email links already build `/t/{slug}` from `webAppUrl` and are unchanged.
 */
export function buildTenantUrl(slug: string, path = '/'): string {
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const enabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN === 'true';
  if (enabled && base && SAFE_SLUG.test(slug)) {
    return `https://${slug}.${base}${path}`;
  }
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://klasso.tn';
  return `${webUrl}/t/${slug}${path}`;
}
