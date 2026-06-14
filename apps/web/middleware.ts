import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { defaultLocale, locales } from '@/i18n';
import { detectLocale, stripLocalePrefix } from '@/lib/i18n/locale-path';
import { REFRESH_COOKIE_NAME } from '@/lib/auth/cookies';
import { resolveBrandedRewrite } from '@/lib/tenant/subdomain-rewrite';

const PROTECTED_PREFIXES = ['/dashboard', '/onboarding', '/commercial', '/platform'];
const AUTH_PREFIXES = ['/login', '/register'];

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'klasso.tn';
const SUBDOMAIN_RESOLVER_ENABLED = process.env.ENABLE_SUBDOMAIN_RESOLVER === 'true';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export function middleware(request: NextRequest): NextResponse {
  const host = request.headers.get('host') ?? '';
  const path = request.nextUrl.pathname;

  // V1.7-A — Subdomain resolver (dormant, gated by ENABLE_SUBDOMAIN_RESOLVER).
  // Selective: ONLY branded pre-auth pages are rewritten to /t/{slug}. Authed
  // pages (/dashboard, the (app) group) pass through — tenant comes from the
  // JWT, never the Host (D3). Fixes the "rewrite everything → 404" bug.
  if (SUBDOMAIN_RESOLVER_ENABLED) {
    const target = resolveBrandedRewrite({
      host,
      path,
      enabled: SUBDOMAIN_RESOLVER_ENABLED,
      baseDomain: BASE_DOMAIN,
      locales,
    });
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.rewrite(url);
    }
  }

  // V1.5 — Auth redirects, now locale-aware for ALL locales (fr/en/es/ar).
  const hasRefreshCookie = !!request.cookies.get(REFRESH_COOKIE_NAME);
  const stripped = stripLocalePrefix(path, locales);
  const locale = detectLocale(path, locales, defaultLocale);

  if (
    PROTECTED_PREFIXES.some((p) => stripped === p || stripped.startsWith(`${p}/`)) &&
    !hasRefreshCookie
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (AUTH_PREFIXES.some((p) => stripped === p) && hasRefreshCookie) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // V0 — delegate to next-intl for locale detection / redirection.
  return intlMiddleware(request);
}

export const config = {
  // Skip _next, api, _vercel, and static files (anything with a dot).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
