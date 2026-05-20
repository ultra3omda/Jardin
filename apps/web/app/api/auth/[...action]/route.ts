import { NextRequest, NextResponse } from 'next/server';
import { REFRESH_COOKIE_NAME, clearRefreshCookie, setRefreshCookie } from '@/lib/auth/cookies';
import type { AuthResponse } from '@/lib/auth/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Context {
  params: { action: string[] };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, ctx: Context): Promise<NextResponse> {
  const action = ctx.params.action.join('/');
  switch (action) {
    case 'login':
    case 'register':
      return proxyAuthAction(request, action);
    case 'refresh':
      return proxyRefresh(request);
    case 'logout':
      return proxyLogout(request);
    default:
      return NextResponse.json({ message: 'Unknown auth action' }, { status: 404 });
  }
}

export async function GET(request: NextRequest, ctx: Context): Promise<NextResponse> {
  const action = ctx.params.action.join('/');
  if (action !== 'me') {
    return NextResponse.json({ message: 'Unknown auth action' }, { status: 404 });
  }
  const auth = request.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ message: 'Missing Authorization header' }, { status: 401 });
  }
  const upstream = await fetch(`${API_URL}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: auth },
  });
  return forwardJson(upstream);
}

/**
 * Proxies /login and /register. On success: strips the refresh token from
 * the body, sets it as an httpOnly cookie, and returns the remaining
 * { accessToken, user, tenant } to the browser.
 */
async function proxyAuthAction(request: NextRequest, action: string): Promise<NextResponse> {
  const body = await request.text();
  const upstream = await fetch(`${API_URL}/api/auth/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!upstream.ok) {
    return forwardJson(upstream);
  }

  const data = (await upstream.json()) as AuthResponse;
  const { refreshToken, ...session } = data;
  const response = NextResponse.json(session, { status: upstream.status });
  setRefreshCookie(response, refreshToken);
  return response;
}

/**
 * Proxies /refresh. The browser doesn't send the token in the body — we
 * pull it from the httpOnly cookie and forward it to the API. On 401
 * (token reuse, expired, etc.) we clear the cookie to force re-login.
 */
async function proxyRefresh(request: NextRequest): Promise<NextResponse> {
  const cookie = request.cookies.get(REFRESH_COOKIE_NAME);
  if (!cookie) {
    return NextResponse.json({ message: 'No refresh session' }, { status: 401 });
  }
  const upstream = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: cookie.value }),
  });

  if (!upstream.ok) {
    const response = await forwardJson(upstream);
    if (upstream.status === 401) {
      clearRefreshCookie(response);
    }
    return response;
  }

  const data = (await upstream.json()) as AuthResponse;
  const { refreshToken, ...session } = data;
  const response = NextResponse.json(session);
  setRefreshCookie(response, refreshToken);
  return response;
}

/**
 * Proxies /logout. Best-effort upstream revocation; we always clear the
 * local cookie so the user is logged out on this device regardless.
 */
async function proxyLogout(request: NextRequest): Promise<NextResponse> {
  const cookie = request.cookies.get(REFRESH_COOKIE_NAME);
  if (cookie) {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: cookie.value }),
    }).catch(() => undefined);
  }
  const response = new NextResponse(null, { status: 204 });
  clearRefreshCookie(response);
  return response;
}

async function forwardJson(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}
