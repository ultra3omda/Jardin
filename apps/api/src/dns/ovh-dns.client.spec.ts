import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OvhDnsClient } from './ovh-dns.client';
import { DnsGuardError } from './dns-provider.interface';

function makeConfig() {
  return {
    get: (key: string) => ({
      'domainAutomation.ovh.appKey': 'ak',
      'domainAutomation.ovh.appSecret': 'as',
      'domainAutomation.ovh.consumerKey': 'ck',
      'domainAutomation.ovh.apiBase': 'https://eu.api.ovh.com/1.0',
      'domainAutomation.dnsZone': 'klasso.tn',
    }[key]),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('OvhDnsClient', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('refuses to create a record for a reserved subdomain (no network call)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const client = new OvhDnsClient(makeConfig());
    await expect(client.upsertCname('mail', 'cname.vercel-dns.com.')).rejects.toBeInstanceOf(DnsGuardError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('creates a CNAME then refreshes the zone when none exists', async () => {
    const calls: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/auth/time')) return new Response('1700000000');
      if (url.includes('/record?')) return new Response('[]'); // findCname → none
      if (url.endsWith('/record')) return new Response(JSON.stringify({ id: 42, subDomain: 'ecole', target: 'cname.vercel-dns.com.', ttl: 60 }));
      if (url.endsWith('/refresh')) return new Response('null');
      throw new Error(`unexpected ${url}`);
    });
    const client = new OvhDnsClient(makeConfig());
    const rec = await client.upsertCname('ecole', 'cname.vercel-dns.com.');
    expect(rec.id).toBe('42');
    expect(calls.some((c) => c.startsWith('POST') && c.endsWith('/record'))).toBe(true);
    expect(calls.some((c) => c.endsWith('/refresh'))).toBe(true);
  });
});
