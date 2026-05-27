import { NextRequest, NextResponse } from 'next/server';
import { REFRESH_COOKIE_NAME, clearRefreshCookie, setRefreshCookie } from '@/lib/auth/cookies';
import type { AuthResponse } from '@/lib/auth/types';

// Use `||` (not `??`) so an empty string also falls back. Catches the
// Vercel case where the env var exists but its value is `""`, which
// would otherwise produce a relative URL and crash undici with
// ERR_INVALID_URL.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

if (!/^https?:\/\//.test(API_URL)) {
  throw new Error(
    `NEXT_PUBLIC_API_URL must be an absolute http(s) URL. Got: "${API_URL}"`,
  );
}

interface Context {
  params: { action?: string[] };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, ctx: Context): Promise<NextResponse> {
  const action = ctx.params.action?.join('/') ?? '';
  switch (action) {
    case 'login':
    case 'register':
    case 'demo-login': // V7 — same shape: strip refreshToken into httpOnly cookie
      return proxyAuthAction(request, action);
    case 'refresh':
      return proxyRefresh(request);
    case 'logout':
      return proxyLogout(request);
    // V1.5 — public endpoints (no cookie, no upstream auth required)
    case 'email/verify':
    case 'password/forgot':
    case 'password/reset':
      return proxyPassthroughPost(request, action, false);
    // V1.5 — authenticated endpoint (browser must attach Bearer)
    case 'email/resend':
      return proxyPassthroughPost(request, action, true);
    default:
      return NextResponse.json({ message: 'Unknown auth action' }, { status: 404 });
  }
}

export async function GET(request: NextRequest, ctx: Context): Promise<NextResponse> {
  const action = ctx.params.action?.join('/') ?? '';
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

/**
 * Generic body+optional-Bearer passthrough for endpoints that don't touch
 * the refresh cookie (V1.5: email verify/resend, password forgot/reset).
 * The request body is forwarded verbatim; the Authorization header is only
 * forwarded when `requireAuth` is true.
 */
async function proxyPassthroughPost(
  request: NextRequest,
  action: string,
  requireAuth: boolean,
): Promise<NextResponse> {
  const body = await request.text();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const auth = request.headers.get('authorization');
    if (!auth) {
      return NextResponse.json({ message: 'Missing Authorization header' }, { status: 401 });
    }
    headers.Authorization = auth;
  }
  const upstream = await fetch(`${API_URL}/api/auth/${action}`, {
    method: 'POST',
    headers,
    body,
  });
  return forwardJson(upstream);
}
