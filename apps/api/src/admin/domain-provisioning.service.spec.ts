/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainProvisioningService } from './domain-provisioning.service';
import { DomainStatus } from '@prisma/client';

function deps(overrides: Record<string, unknown> = {}) {
  const tenant = { id: 't1', slug: 'ecole', name: 'École', brand: null, locale: 'fr' };
  const admin = { id: 'u1', email: 'admin@ecole.tn', firstName: 'A', lastName: 'B' };
  const prisma = {
    tenant: {
      findFirst: vi.fn().mockResolvedValue(tenant),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(tenant),
    },
    user: { findFirst: vi.fn().mockResolvedValue(admin) },
    auditLog: { create: vi.fn() },
  };
  const dns = {
    upsertCname: vi.fn().mockResolvedValue({ id: '1' }),
    deleteCname: vi.fn(),
  };
  const vercel = {
    addDomain: vi.fn(),
    isReady: vi.fn().mockResolvedValue(true),
    removeDomain: vi.fn(),
  };
  const resend = { send: vi.fn().mockResolvedValue({ success: true }) };
  const invites = {
    create: vi.fn().mockResolvedValue({
      id: 'i1',
      url: 'https://ecole.klasso.tn/register?token=x',
      expiresAt: '2030-01-01',
    }),
  };
  const config = {
    get: (k: string) =>
      ({
        'domainAutomation.enabled': true,
        'domainAutomation.cnameTarget': 'cname.vercel-dns.com.',
        'domainAutomation.baseDomain': 'klasso.tn',
        'domainAutomation.pollIntervalMs': 0,
        'domainAutomation.pollMaxAttempts': 3,
      })[k],
  };
  return { prisma, dns, vercel, resend, invites, config, ...overrides };
}

function make(d: ReturnType<typeof deps>) {
  return new DomainProvisioningService(
    d.dns as any,
    d.vercel as any,
    d.prisma as any,
    d.config as any,
    d.resend as any,
    d.invites as any,
  );
}

describe('DomainProvisioningService', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('provisions → ACTIVE and emails the subdomain invite', async () => {
    const d = deps();
    await make(d).provision('t1', 'super1');

    expect(d.dns.upsertCname).toHaveBeenCalledWith('ecole', 'cname.vercel-dns.com.');
    expect(d.vercel.addDomain).toHaveBeenCalledWith('ecole.klasso.tn');
    expect(d.invites.create).toHaveBeenCalledWith(
      'super1',
      expect.anything(),
      expect.anything(),
      't1',
      'https://ecole.klasso.tn',
    );
    expect(d.resend.send).toHaveBeenCalled();

    const last = (d.prisma.tenant.update.mock.calls as any[][]).at(-1)![0] as any;
    expect(last.data.domainStatus).toBe(DomainStatus.ACTIVE);
  });

  it('marks FAILED and sends a path-based fallback invite when SSL never becomes ready', async () => {
    const d = deps();
    d.vercel.isReady = vi.fn().mockResolvedValue(false);
    await make(d).provision('t1', 'super1');

    const last = (d.prisma.tenant.update.mock.calls as any[][]).at(-1)![0] as any;
    expect(last.data.domainStatus).toBe(DomainStatus.FAILED);
    // fallback invite uses no baseUrlOverride (5th arg undefined)
    expect(d.invites.create).toHaveBeenCalledWith(
      'super1',
      expect.anything(),
      expect.anything(),
      't1',
      undefined,
    );
    expect(d.resend.send).toHaveBeenCalled();
  });

  it('marks FAILED when OVH throws', async () => {
    const d = deps();
    d.dns.upsertCname = vi.fn().mockRejectedValue(new Error('ovh down'));
    await make(d).provision('t1', 'super1');

    const last = (d.prisma.tenant.update.mock.calls as any[][]).at(-1)![0] as any;
    expect(last.data.domainStatus).toBe(DomainStatus.FAILED);
    expect(last.data.domainError).toContain('ovh down');
  });
});
