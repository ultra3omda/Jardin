import type { NextResponse } from 'next/server';

export const REFRESH_COOKIE_NAME = 'ecole_refresh_token';

/** 30 days, matches the API's default JWT_REFRESH_EXPIRES_IN. */
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
  /** V1.7-A — `.klasso.tn` in subdomain mode so the refresh cookie is shared
   *  across every `<slug>.klasso.tn`. Omitted (host-only) otherwise. */
  domain?: string;
}

/**
 * Cookie attributes for the refresh token. httpOnly + Secure + SameSite=Lax
 * is the standard recipe for refresh tokens served from a same-origin
 * Route Handler proxy. We DO NOT use SameSite=Strict because that would
 * break OAuth-style redirects later.
 */
/**
 * Cookie `Domain` attribute. In subdomain mode the refresh cookie must be
 * readable on every `<slug>.klasso.tn`, so we scope it to `.<base>`. In path
 * mode (apex / Vercel preview) we return undefined → host-only cookie (R1: a
 * `.klasso.tn` domain cookie would not apply on `*.vercel.app` anyway).
 */
export function subdomainCookieDomain(): string | undefined {
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const enabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN === 'true';
  return enabled && base ? `.${base}` : undefined;
}

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    domain: subdomainCookieDomain(),
  };
}

export function setRefreshCookie(response: NextResponse, token: string): void {
  response.cookies.set(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set(REFRESH_COOKIE_NAME, '', {
    ...refreshCookieOptions(),
    maxAge: 0,
  });
}
