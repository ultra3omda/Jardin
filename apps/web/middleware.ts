import { NextRequest, NextResponse } from 'next/server';
import { REFRESH_COOKIE_NAME } from '@/lib/auth/cookies';

const PROTECTED_PREFIXES = ['/dashboard'];
const AUTH_PREFIXES = ['/login', '/register'];

/**
 * Server-side guard based ONLY on the presence of the httpOnly refresh
 * cookie. The actual access token lives in memory client-side; the cookie
 * is a hint to skip the login round-trip when a session likely exists.
 *
 * - /dashboard without cookie -> redirect to /login?next=/dashboard
 * - /login or /register with cookie -> redirect to /dashboard
 *   (cookie may still be revoked server-side; the layout will detect it
 *   when refresh() fails and clear the session)
 */
export function middleware(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname;
  const hasRefreshCookie = !!request.cookies.get(REFRESH_COOKIE_NAME);

  if (PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) && !hasRefreshCookie) {
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

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
