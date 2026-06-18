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

/** Minimal fetch mock that handles /auth/time and a pre-seeded record list. */
function makeFetchWithRecord(recordId: number, subDomain: string, target: string) {
  const calls: Array<{ method: string; url: string }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockFetch = vi.fn(async (input: any, init: any) => {
    const url = String(input);
    const method: string = init?.method ?? 'GET';
    calls.push({ method, url });

    if (url.endsWith('/auth/time')) return new Response('1700000000');
    if (url.includes('/record?'))
      return new Response(JSON.stringify([recordId]));
    if (url.includes(`/record/${recordId}`) && method === 'GET')
      return new Response(JSON.stringify({ id: recordId, subDomain, target, ttl: 60 }));
    if (url.includes(`/record/${recordId}`) && method === 'DELETE')
      return new Response('null');
    if (url.endsWith('/refresh')) return new Response('null');
    throw new Error(`unexpected ${method} ${url}`);
  });
  return { mockFetch, calls };
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

  it('deleteCname issues DELETE + refresh when the record exists', async () => {
    const { mockFetch, calls } = makeFetchWithRecord(99, 'ecole', 'cname.vercel-dns.com.');
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);

    const client = new OvhDnsClient(makeConfig());
    await client.deleteCname('ecole');

    const deleteCalls = calls.filter((c) => c.method === 'DELETE');
    const refreshCalls = calls.filter((c) => c.method === 'POST' && c.url.endsWith('/refresh'));
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0].url).toContain('/record/99');
    expect(refreshCalls).toHaveLength(1);
  });

  it('deleteCname is a no-op (no DELETE) when no record exists', async () => {
    const calls: Array<{ method: string; url: string }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = String(input);
      const method: string = init?.method ?? 'GET';
      calls.push({ method, url });
      if (url.endsWith('/auth/time')) return new Response('1700000000');
      if (url.includes('/record?')) return new Response('[]'); // no records
      throw new Error(`unexpected ${method} ${url}`);
    });

    const client = new OvhDnsClient(makeConfig());
    await client.deleteCname('ecole');

    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0);
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });

  it('rejects (and does not cache NaN) when /auth/time returns a non-2xx response', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.endsWith('/auth/time')) return new Response('oops', { status: 503 });
      throw new Error(`unexpected ${url}`);
    });

    const client = new OvhDnsClient(makeConfig());
    // upsertCname triggers serverTimestamp → fetchTimeOffset → should reject
    await expect(
      client.upsertCname('ecole', 'cname.vercel-dns.com.'),
    ).rejects.toThrow('OVH /auth/time HTTP 503');

    // A second call must also reject (NaN must not have been cached)
    await expect(
      client.upsertCname('ecole', 'cname.vercel-dns.com.'),
    ).rejects.toThrow('OVH /auth/time HTTP 503');
  });

  it('rejects when /auth/time returns a non-numeric body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.endsWith('/auth/time')) return new Response('not-a-number', { status: 200 });
      throw new Error(`unexpected ${url}`);
    });

    const client = new OvhDnsClient(makeConfig());
    await expect(
      client.upsertCname('ecole', 'cname.vercel-dns.com.'),
    ).rejects.toThrow('OVH /auth/time returned non-numeric body');
  });
});
