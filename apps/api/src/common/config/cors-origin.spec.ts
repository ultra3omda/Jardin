import { isAllowedOrigin } from './cors-origin';

describe('isAllowedOrigin', () => {
  const allowlist = ['https://klasso.tn', 'http://localhost:3000'];

  it('allows a valid tenant subdomain over https', () => {
    expect(isAllowedOrigin('https://ecole-victor-hugo.klasso.tn', allowlist)).toBe(true);
  });

  it('allows an origin present in the static allowlist', () => {
    expect(isAllowedOrigin('https://klasso.tn', allowlist)).toBe(true);
  });

  it('allows an undefined origin (server-to-server / curl)', () => {
    expect(isAllowedOrigin(undefined, allowlist)).toBe(true);
  });

  it('rejects an unrelated origin', () => {
    expect(isAllowedOrigin('https://evil.com', allowlist)).toBe(false);
  });

  it('rejects http (non-TLS) subdomains', () => {
    expect(isAllowedOrigin('http://ecole.klasso.tn', allowlist)).toBe(false);
  });

  it('rejects nested sub-subdomains', () => {
    expect(isAllowedOrigin('https://a.b.klasso.tn', allowlist)).toBe(false);
  });

  it('rejects look-alike suffixes', () => {
    expect(isAllowedOrigin('https://klasso.tn.attacker.com', allowlist)).toBe(false);
  });
});
