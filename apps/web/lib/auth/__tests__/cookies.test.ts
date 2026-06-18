import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextResponse } from 'next/server';
import { clearRefreshCookie, refreshCookieOptions, subdomainCookieDomain } from '../cookies';

/** Minimal NextResponse stand-in: clearRefreshCookie only touches `headers`. */
function mockResponse(): NextResponse {
  return { headers: new Headers() } as unknown as NextResponse;
}

describe('subdomainCookieDomain', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns `.<base>` in subdomain mode', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', 'klasso.tn');
    expect(subdomainCookieDomain()).toBe('.klasso.tn');
  });

  it('returns undefined in path mode (host-only cookie)', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'false');
    expect(subdomainCookieDomain()).toBeUndefined();
  });

  it('omits the domain from refresh cookie options in path mode', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'false');
    expect(refreshCookieOptions().domain).toBeUndefined();
  });
});

describe('clearRefreshCookie', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('clears only the host-only cookie in path mode', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'false');
    const res = mockResponse();
    clearRefreshCookie(res);
    const cookies = res.headers.getSetCookie();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain('ecole_refresh_token=;');
    expect(cookies[0]).toContain('Max-Age=0');
    expect(cookies[0]).not.toContain('Domain=');
  });

  it('clears BOTH host-only and .<base>-scoped cookies in subdomain mode', () => {
    // Regression: a session created before subdomain mode has a host-only
    // cookie; a domain-scoped-only clear cannot delete it → user stuck logged in.
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', 'klasso.tn');
    const res = mockResponse();
    clearRefreshCookie(res);
    const cookies = res.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies.some((c) => !c.includes('Domain='))).toBe(true);
    expect(cookies.some((c) => c.includes('Domain=.klasso.tn'))).toBe(true);
    expect(cookies.every((c) => c.includes('Max-Age=0'))).toBe(true);
  });
});
