/**
 * Locale-prefix helpers for the Next.js middleware.
 *
 * Pure + unit-tested so the locale-aware auth redirects work for EVERY
 * configured locale (fr/en/es/ar), not just a hardcoded subset. Kept dependency
 * free (no next/server) so it runs in the edge middleware and under Vitest.
 */

/** Strip a leading `/{locale}` segment: `/fr/dashboard` → `/dashboard`, `/en` → `/`. */
export function stripLocalePrefix(path: string, locales: readonly string[]): string {
  for (const locale of locales) {
    if (path === `/${locale}`) return '/';
    if (path.startsWith(`/${locale}/`)) return path.slice(locale.length + 1);
  }
  return path;
}

/**
 * Detect the locale prefix of a path, falling back to `fallback` when none is
 * present. Replaces the previous `/^\/(fr|ar)/` regex that silently dropped
 * `en`/`es` visitors to the default locale on auth redirects.
 */
export function detectLocale(
  path: string,
  locales: readonly string[],
  fallback: string,
): string {
  for (const locale of locales) {
    if (path === `/${locale}` || path.startsWith(`/${locale}/`)) return locale;
  }
  return fallback;
}
