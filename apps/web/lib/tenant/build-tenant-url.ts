/**
 * Canonical URL for a tenant, per the active routing mode.
 *
 * - Subdomain mode (NEXT_PUBLIC_ENABLE_SUBDOMAIN=true + NEXT_PUBLIC_BASE_DOMAIN
 *   set): `https://<slug>.<base><path>`.
 * - Path mode (default / preview / apex): `<web-url>/t/<slug><path>`.
 *
 * Used for post-login redirects and cross-tenant links. The API's outbound
 * email links already build `/t/{slug}` from `webAppUrl` and are unchanged.
 */
export function buildTenantUrl(slug: string, path = '/'): string {
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const enabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN === 'true';
  if (enabled && base) {
    return `https://${slug}.${base}${path}`;
  }
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://klasso.tn';
  return `${webUrl}/t/${slug}${path}`;
}
