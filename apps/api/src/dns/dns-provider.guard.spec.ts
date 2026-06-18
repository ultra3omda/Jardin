import { describe, it, expect } from 'vitest';
import { assertSafeSubdomain, DnsGuardError } from './dns-provider.interface';

describe('assertSafeSubdomain', () => {
  it('accepts a valid tenant slug', () => {
    expect(() => assertSafeSubdomain('ecole-victor-hugo')).not.toThrow();
  });

  it('rejects email/system labels (protects OVH MX)', () => {
    for (const s of ['mail', 'mx', 'smtp', 'imap', 'autodiscover', 'autoconfig', '_dmarc', '_domainkey', 'ns1', 'ns2', 'www', '@']) {
      expect(() => assertSafeSubdomain(s)).toThrow(DnsGuardError);
    }
  });

  it('rejects malformed labels', () => {
    for (const s of ['', 'UPPER', 'a.b', 'has space', '-leading', 'trailing-']) {
      expect(() => assertSafeSubdomain(s)).toThrow(DnsGuardError);
    }
  });
});
