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
}

/**
 * Cookie attributes for the refresh token. httpOnly + Secure + SameSite=Lax
 * is the standard recipe for refresh tokens served from a same-origin
 * Route Handler proxy. We DO NOT use SameSite=Strict because that would
 * break OAuth-style redirects later.
 */
export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
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
