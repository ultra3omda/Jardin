import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTenantUrl } from '../build-tenant-url';

describe('buildTenantUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds a subdomain URL when subdomain mode is enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', 'klasso.tn');
    expect(buildTenantUrl('ecole', '/dashboard')).toBe('https://ecole.klasso.tn/dashboard');
  });

  it('falls back to path mode when subdomain mode is disabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'false');
    vi.stubEnv('NEXT_PUBLIC_WEB_URL', 'https://klasso.tn');
    expect(buildTenantUrl('ecole', '/dashboard')).toBe('https://klasso.tn/t/ecole/dashboard');
  });

  it('falls back to path mode when the base domain is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', '');
    vi.stubEnv('NEXT_PUBLIC_WEB_URL', 'https://klasso.tn');
    expect(buildTenantUrl('ecole', '/dashboard')).toBe('https://klasso.tn/t/ecole/dashboard');
  });

  it('defaults the path to root', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', 'klasso.tn');
    expect(buildTenantUrl('ecole')).toBe('https://ecole.klasso.tn/');
  });

  it('falls back to origin-safe path mode for a malformed slug (open-redirect guard)', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', 'klasso.tn');
    vi.stubEnv('NEXT_PUBLIC_WEB_URL', 'https://klasso.tn');
    // A slug that would escape the origin in subdomain mode must NOT become the
    // host — it stays on our own origin as a (harmless) path segment.
    expect(buildTenantUrl('evil.com/x#', '/dashboard')).toBe(
      'https://klasso.tn/t/evil.com/x#/dashboard',
    );
  });
});
