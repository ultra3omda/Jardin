import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshCookieOptions, subdomainCookieDomain } from '../cookies';

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
