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
});
