import { extractTenantSlugFromHost } from '@/lib/tenant/extract-tenant-slug';

/**
 * Pre-auth pages that carry tenant branding. On a tenant subdomain
 * (`<slug>.klasso.tn`) ONLY these are rewritten to the branded `/t/{slug}/...`
 * route group. Authenticated pages (/dashboard, the (app) group) pass through
 * untouched — their tenant comes from the JWT, never from the host (D3).
 */
export const BRANDED_PREAUTH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

export interface ResolveBrandedRewriteInput {
  host: string;
  path: string;
  enabled: boolean;
  baseDomain: string;
  locales: readonly string[];
}

/** Strip a leading `/{locale}` segment: `/fr/login` → `{ locale: 'fr', rest: '/login' }`. */
function splitLocale(
  path: string,
  locales: readonly string[],
): { locale: string; rest: string } {
  for (const locale of locales) {
    if (path === `/${locale}`) return { locale, rest: '/' };
    if (path.startsWith(`/${locale}/`)) {
      return { locale, rest: path.slice(locale.length + 1) };
    }
  }
  return { locale: '', rest: path };
}

/**
 * Decide whether a request on a tenant subdomain must be rewritten to the
 * branded `/t/{slug}` route. Returns the target pathname, or null to pass
 * through unchanged. Pure function — no `next/server` dependency, unit-testable.
 */
export function resolveBrandedRewrite(
  input: ResolveBrandedRewriteInput,
): string | null {
  if (!input.enabled) return null;
  const slug = extractTenantSlugFromHost(input.host, input.baseDomain);
  if (!slug) return null;

  const { locale, rest } = splitLocale(input.path, input.locales);
  const isBrandedPreauth = BRANDED_PREAUTH_PREFIXES.some(
    (p) => rest === p || rest.startsWith(`${p}/`),
  );
  if (!isBrandedPreauth) return null; // authed pages → passthrough (tenant via JWT)
  if (rest.startsWith(`/t/${slug}`)) return null; // already branded

  return locale ? `/${locale}/t/${slug}${rest}` : `/t/${slug}${rest}`;
}
