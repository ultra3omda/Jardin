import { NextRequest, NextResponse } from 'next/server';
import { REFRESH_COOKIE_NAME } from '@/lib/auth/cookies';
import { extractTenantSlugFromHost } from '@/lib/tenant/extract-tenant-slug';

const PROTECTED_PREFIXES = ['/dashboard'];
const AUTH_PREFIXES = ['/login', '/register'];

/**
 * V1.7-A — Bloc host-resolver dormant.
 *
 * Actif uniquement si ENABLE_SUBDOMAIN_RESOLVER=true.
 * En V1.7-A (avant livraison klasso.tn) : inactif.
 * En V1.7-B (après DNS OVH + Vercel domain) : activer via env Vercel.
 *
 * Quand actif, redirige <slug>.klasso.tn/* → /t/<slug>/*
 * afin de rester compatible avec le routage path-based V1.6.
 */
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'klasso.tn';
const SUBDOMAIN_RESOLVER_ENABLED =
  process.env.ENABLE_SUBDOMAIN_RESOLVER === 'true';

export function middleware(request: NextRequest): NextResponse {
  const host = request.headers.get('host') ?? '';
  const path = request.nextUrl.pathname;

  // ── Bloc host-resolver (dormant en V1.7-A) ──────────────────────────
  if (SUBDOMAIN_RESOLVER_ENABLED) {
    const slug = extractTenantSlugFromHost(host, BASE_DOMAIN);
    if (slug) {
      // Éviter la boucle : /t/<slug> est déjà le path target
      if (!path.startsWith(`/t/${slug}`)) {
        const url = request.nextUrl.clone();
        url.pathname = `/t/${slug}${path}`;
        return NextResponse.rewrite(url);
      }
    }
  }
  // ────────────────────────────────────────────────────────────────────

  // ── Auth redirects (V1.5 inchangé) ──────────────────────────────────
  const hasRefreshCookie = !!request.cookies.get(REFRESH_COOKIE_NAME);

  if (
    PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) &&
    !hasRefreshCookie
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (AUTH_PREFIXES.some((p) => path === p) && hasRefreshCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Matcher notes:
 * - The first three patterns target the auth redirect logic (V1.5).
 * - The catch-all `/((?!_next|api|favicon).*)` is required by the V1.7-A
 *   host-resolver so it can intercept tenant subdomains on ANY public path
 *   (e.g. `https://victor-hugo.klasso.tn/` or `/about`). Next.js matchers
 *   are static (evaluated at build time) so we cannot gate the catch-all
 *   behind `ENABLE_SUBDOMAIN_RESOLVER` — the runtime gate inside `middleware()`
 *   handles that. The auth logic remains path-scoped via PROTECTED_PREFIXES /
 *   AUTH_PREFIXES, so the broader match scope does not change auth behaviour.
 */
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/((?!_next|api|favicon).*)'],
};
