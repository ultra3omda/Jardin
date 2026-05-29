import { describe, expect, it } from 'vitest';
import { resolveBrandedRewrite } from '../subdomain-rewrite';

const LOCALES = ['fr', 'ar'] as const;
const base = { enabled: true, baseDomain: 'klasso.tn', locales: LOCALES };

describe('resolveBrandedRewrite', () => {
  it('rewrites a branded pre-auth page on a tenant subdomain', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/login' }),
    ).toBe('/fr/t/ecole/login');
  });

  it('passes through authenticated pages (no rewrite)', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/dashboard' }),
    ).toBeNull();
  });

  it('returns null when the resolver is disabled', () => {
    expect(
      resolveBrandedRewrite({ ...base, enabled: false, host: 'ecole.klasso.tn', path: '/fr/login' }),
    ).toBeNull();
  });

  it('returns null on the apex domain (no tenant subdomain)', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'klasso.tn', path: '/fr/login' }),
    ).toBeNull();
  });

  it('returns null for a reserved subdomain label', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'www.klasso.tn', path: '/fr/login' }),
    ).toBeNull();
  });

  it('does not double-rewrite an already-branded path', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/t/ecole/login' }),
    ).toBeNull();
  });

  it('handles a path without a locale prefix', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/login' }),
    ).toBe('/t/ecole/login');
  });
});
