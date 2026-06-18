/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainProvisioningService } from './domain-provisioning.service';
import { DomainStatus } from '@prisma/client';

// RLS_SESSION_ENABLED is intentionally NOT set in the unit spec so
// withTenantRls() takes the fast `await work()` branch — keeping these
// tests focused on business logic without needing a real Prisma tx.

function deps(overrides: Record<string, unknown> = {}) {
  const tenant = { id: 't1', slug: 'ecole', name: 'École', brand: null, locale: 'fr' };
  const admin = { id: 'u1', email: 'admin@ecole.tn', firstName: 'A', lastName: 'B' };

  // txStub: used only when $transaction is exercised (RLS path, not active here).
  const txStub = { $queryRawUnsafe: vi.fn().mockResolvedValue(undefined) };

  const prisma = {
    tenant: {
      findFirst: vi.fn().mockResolvedValue(tenant),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(tenant),
    },
    user: { findFirst: vi.fn().mockResolvedValue(admin) },
    auditLog: { create: vi.fn() },
    // Safe $transaction fallback — passes the tx stub to the callback.
    $transaction: vi.fn().mockImplementation(
      (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
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
  // tenantContext mock: run() simply invokes the work callback, get() returns undefined.
  const tenantContext = {
    get: vi.fn().mockReturnValue(undefined),
    run: vi.fn().mockImplementation((_ctx: unknown, work: () => Promise<unknown>) => work()),
  };
  return { prisma, dns, vercel, resend, invites, config, tenantContext, ...overrides };
}

function make(d: ReturnType<typeof deps>) {
  return new DomainProvisioningService(
    d.dns as any,
    d.vercel as any,
    d.prisma as any,
    d.config as any,
    d.resend as any,
    d.invites as any,
    d.tenantContext as any,
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

  it('resolves without throwing even when prisma.update inside fail() rejects', async () => {
    const d = deps();
    // DNS throws → enters fail() path
    d.dns.upsertCname = vi.fn().mockRejectedValue(new Error('dns error'));
    // prisma.update inside fail() also rejects
    d.prisma.tenant.update = vi.fn().mockRejectedValue(new Error('db down'));
    // provision() must resolve, never reject
    await expect(make(d).provision('t1', 'super1')).resolves.toBeUndefined();
  });

  it('domain stays ACTIVE even when invite send throws after successful provisioning', async () => {
    const d = deps();
    // vercel is ready → success path
    d.vercel.isReady = vi.fn().mockResolvedValue(true);
    // invite creation throws after ACTIVE is written
    d.invites.create = vi.fn().mockRejectedValue(new Error('smtp timeout'));

    await expect(make(d).provision('t1', 'super1')).resolves.toBeUndefined();

    // The last prisma.tenant.update call must have set ACTIVE, not FAILED
    const calls = d.prisma.tenant.update.mock.calls as any[][];
    const activeCall = calls.find((c) => c[0]?.data?.domainStatus === DomainStatus.ACTIVE);
    expect(activeCall).toBeDefined();
    // Must NOT have set FAILED at any point
    const failedCall = calls.find((c) => c[0]?.data?.domainStatus === DomainStatus.FAILED);
    expect(failedCall).toBeUndefined();
  });
});
