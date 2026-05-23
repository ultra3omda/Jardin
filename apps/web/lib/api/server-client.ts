import { cookies } from 'next/headers';
import { cache } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { REFRESH_COOKIE_NAME } from '@/lib/auth/cookies';
import type { AuthUser, AuthTenant } from '@/lib/auth/types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';

/** Tenant shape returned by getMeFromCookies — brand fully merged over DEFAULT_BRAND. */
export interface ServerTenant extends Omit<AuthTenant, 'brand'> {
  brand: TenantBrand;
}

export interface ServerSession {
  user: AuthUser;
  tenant: ServerTenant | null;
  /** Short-lived bearer token for additional server-side API calls in the same RSC tick. */
  accessToken: string;
}

/**
 * V1.6 — Server-side: exchange the refresh cookie for an access token,
 * then GET /api/auth/me. Used by Server Components in the (app) segment
 * to know who's logged in and which brand to inject.
 *
 * Returns null if no cookie / refresh failed (caller redirects to /login).
 * On network/upstream failure we also return null — the (app) layout
 * already gates on this.
 *
 * BUG FIX 2026-05-23 — wrapped in React.cache() so multiple Server Components
 * in the same request (layout + page) share a single /auth/refresh call.
 * Without cache(), V1.5's refresh-token-rotation revokes the cookie on the
 * first call and the second call fails 401 → page redirects /login →
 * middleware re-redirects /dashboard → infinite-feeling loop on
 * /settings/branding (and any (app) segment page).
 *
 * Cache scope = single request. Across requests, the function re-runs.
 */
export const getMeFromCookies = cache(async function getMeFromCookiesImpl(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE_NAME);
  if (!refresh) return null;

  // 1) Exchange refresh → access
  let accessToken: string;
  try {
    const r = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh.value }),
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { accessToken?: string };
    if (!j.accessToken) return null;
    accessToken = j.accessToken;
  } catch {
    return null;
  }

  // 2) /me
  try {
    const me = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!me.ok) return null;
    const data = (await me.json()) as { user: AuthUser; tenant: AuthTenant | null };

    const tenant: ServerTenant | null = data.tenant
      ? {
          ...data.tenant,
          brand: {
            ...DEFAULT_BRAND,
            ...((data.tenant.brand ?? {}) as Partial<TenantBrand>),
          },
        }
      : null;

    return { user: data.user, tenant, accessToken };
  } catch {
    return null;
  }
});
