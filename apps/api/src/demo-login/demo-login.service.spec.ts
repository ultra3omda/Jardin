import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { DemoLoginService } from './demo-login.service';

function buildPrismaMock() {
  return {
    user: { findFirst: vi.fn(), upsert: vi.fn(), create: vi.fn() },
    tenant: { findUnique: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

function buildAuthMock() {
  return {
    issueTokens: vi.fn(async () => ({
      accessToken: 'access',
      refreshToken: 'refresh',
    })),
  };
}

describe('DemoLoginService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let auth: ReturnType<typeof buildAuthMock>;
  let service: DemoLoginService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    auth = buildAuthMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new DemoLoginService(prisma as any, auth as any);
  });

  it('throws 404 when persona is unknown', async () => {
    // @ts-expect-error testing invalid persona
    await expect(service.demoLogin('not-a-persona', '127.0.0.1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws 403 when DEMO_ACCOUNTS_ENABLED=false', async () => {
    process.env.DEMO_ACCOUNTS_ENABLED = 'false';
    await expect(service.demoLogin('admin-primary', '127.0.0.1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    delete process.env.DEMO_ACCOUNTS_ENABLED;
  });

  it('returns tokens + user + tenant for valid persona', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'admin@demo-ecole.klasso.tn',
      firstName: 'Amadou',
      lastName: 'Koné',
      role: 'SCHOOL_ADMIN',
      locale: 'fr',
      tenant: {
        id: 't1',
        name: 'Démo École Pilote',
        slug: 'demo-ecole',
        type: 'PRIMARY_SCHOOL',
        brand: null,
      },
    });

    const res = await service.demoLogin('admin-primary', '127.0.0.1');
    expect(res.user.id).toBe('u1');
    expect(res.tenant?.slug).toBe('demo-ecole');
    expect(res.accessToken).toBe('access');
    expect(res.refreshToken).toBe('refresh');
    expect(auth.issueTokens).toHaveBeenCalledTimes(1);
  });

  it('writes audit log with persona + ip on success', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'admin@demo-ecole.klasso.tn',
      firstName: 'A',
      lastName: 'K',
      role: 'SCHOOL_ADMIN',
      locale: 'fr',
      tenant: { id: 't1', name: 'X', slug: 'demo-ecole', type: 'PRIMARY_SCHOOL', brand: null },
    });
    await service.demoLogin('admin-primary', '1.2.3.4');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'demo.login',
        ip: '1.2.3.4',
        userId: 'u1',
      }),
    }));
  });

  it('V7-C — auto-seeds demo user when not found (self-healing)', async () => {
    // 1st findFirst → null (user not seeded yet)
    prisma.user.findFirst.mockResolvedValueOnce(null);

    // tenant.upsert returns the demo tenant
    prisma.tenant.upsert.mockResolvedValueOnce({
      id: 't-seeded',
      slug: 'demo-ecole',
      name: 'Démo École Pilote',
      type: 'PRIMARY_SCHOOL',
      locale: 'fr',
      timezone: 'Africa/Tunis',
      brand: null,
    });

    // user.upsert returns the freshly seeded user
    prisma.user.upsert.mockResolvedValueOnce({
      id: 'u-seeded',
      tenantId: 't-seeded',
      email: 'admin@demo-ecole.klasso.tn',
      firstName: 'Amadou',
      lastName: 'Koné',
      role: 'SCHOOL_ADMIN',
      locale: 'fr',
      passwordHash: 'hashed',
    });

    const res = await service.demoLogin('admin-primary', '127.0.0.1');

    expect(prisma.tenant.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
    expect(res.user.id).toBe('u-seeded');
    expect(res.tenant?.slug).toBe('demo-ecole');
    expect(res.accessToken).toBe('access');

    // Audit log marks the seeded path
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'demo.login',
          resource: 'persona:admin-primary:seeded',
        }),
      }),
    );
  });

});
