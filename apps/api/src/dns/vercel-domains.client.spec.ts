import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VercelDomainsClient } from './vercel-domains.client';

function makeConfig() {
  return {
    get: (key: string) => ({
      'domainAutomation.vercel.token': 'tok',
      'domainAutomation.vercel.projectId': 'prj_1',
      'domainAutomation.vercel.teamId': 'team_1',
      'domainAutomation.vercel.apiBase': 'https://api.vercel.com',
    }[key]),
  } as any;
}

describe('VercelDomainsClient', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('treats an already-added domain (409) as success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'domain_already_in_use' } }), { status: 409 }),
    );
    const client = new VercelDomainsClient(makeConfig());
    await expect(client.addDomain('ecole.klasso.tn')).resolves.toBeUndefined();
  });

  it('isReady true only when verified && !misconfigured', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('/v9/projects/')) return new Response(JSON.stringify({ verified: true }));
      if (url.includes('/v6/domains/')) return new Response(JSON.stringify({ misconfigured: false }));
      throw new Error(`unexpected ${url}`);
    });
    const client = new VercelDomainsClient(makeConfig());
    expect(await client.isReady('ecole.klasso.tn')).toBe(true);
  });

  it('isReady false when misconfigured', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('/v9/projects/')) return new Response(JSON.stringify({ verified: true }));
      return new Response(JSON.stringify({ misconfigured: true }));
    });
    const client = new VercelDomainsClient(makeConfig());
    expect(await client.isReady('ecole.klasso.tn')).toBe(false);
  });
});
