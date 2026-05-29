import { describe, expect, it } from 'vitest';
import { shouldRedirectForSlugMismatch } from '../subdomain-consistency';

const base = { enabled: true, baseDomain: 'klasso.tn' };

describe('shouldRedirectForSlugMismatch', () => {
  it('redirects when host slug != JWT slug', () => {
    expect(
      shouldRedirectForSlugMismatch({ ...base, host: 'ecole-a.klasso.tn', jwtSlug: 'ecole-b' }),
    ).toBe(true);
  });

  it('does not redirect when host slug matches JWT slug', () => {
    expect(
      shouldRedirectForSlugMismatch({ ...base, host: 'ecole-a.klasso.tn', jwtSlug: 'ecole-a' }),
    ).toBe(false);
  });

  it('does not redirect on the apex domain (path mode)', () => {
    expect(
      shouldRedirectForSlugMismatch({ ...base, host: 'klasso.tn', jwtSlug: 'ecole-a' }),
    ).toBe(false);
  });

  it('does not redirect when the resolver is disabled', () => {
    expect(
      shouldRedirectForSlugMismatch({
        ...base,
        enabled: false,
        host: 'ecole-a.klasso.tn',
        jwtSlug: 'ecole-b',
      }),
    ).toBe(false);
  });

  it('does not redirect when the session has no tenant slug', () => {
    expect(
      shouldRedirectForSlugMismatch({ ...base, host: 'ecole-a.klasso.tn', jwtSlug: undefined }),
    ).toBe(false);
  });
});
