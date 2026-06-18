import { describe, it, expect } from 'vitest';
import { resolveBrandedRewrite } from './subdomain-rewrite';

const base = {
  enabled: true,
  baseDomain: 'klasso.tn',
  locales: ['fr', 'en', 'ar', 'es'] as const,
};

describe('resolveBrandedRewrite', () => {
  it('rewrites pre-auth /fr/login on a tenant subdomain to /fr/t/<slug>/login', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/login' }),
    ).toBe('/fr/t/ecole/login');
  });

  it('passes /fr/dashboard through unchanged (tenant resolved via JWT, not host)', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/dashboard' }),
    ).toBeNull();
  });

  it('returns null for a reserved slug (www.klasso.tn) even on a pre-auth path', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'www.klasso.tn', path: '/fr/login' }),
    ).toBeNull();
  });

  it('returns null when the feature flag is disabled', () => {
    expect(
      resolveBrandedRewrite({ ...base, enabled: false, host: 'ecole.klasso.tn', path: '/fr/login' }),
    ).toBeNull();
  });

  it('rewrites /register (another pre-auth prefix) on a subdomain', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'lycee.klasso.tn', path: '/fr/register' }),
    ).toBe('/fr/t/lycee/register');
  });

  it('returns null for the apex domain (no subdomain)', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'klasso.tn', path: '/fr/login' }),
    ).toBeNull();
  });

  it('does not double-rewrite a path already under /t/<slug>', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/t/ecole/login' }),
    ).toBeNull();
  });
});
