import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from './audit.service';

const meta = { ip: '127.0.0.1', userAgent: 'vitest' };

function buildPrisma() {
  return {
    auditLog: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'a1',
          action: 'admin.tenant.created',
          resource: 'tenant',
          tenantId: null,
          userId: 'super-1',
          ip: '10.0.0.1',
          metadata: { slug: 'demo' },
          createdAt: new Date('2026-05-01T10:00:00.000Z'),
          user: { email: 'super@klasso.tn' },
          tenant: null,
        },
      ]),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let prisma: ReturnType<typeof buildPrisma>;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuditService);
  });

  it('maps rows to DTOs with tenant/user joins flattened', async () => {
    const result = await service.list('super-1', {}, meta);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.items[0]).toMatchObject({
      id: 'a1',
      action: 'admin.tenant.created',
      userEmail: 'super@klasso.tn',
      tenantSlug: null,
      createdAt: '2026-05-01T10:00:00.000Z',
    });
  });

  it('builds a filtered where clause and paginates', async () => {
    await service.list('super-1', { action: 'tenant', tenantId: 't1', page: 2, pageSize: 10 }, meta);
    const args = prisma.auditLog.findMany.mock.calls[0][0];
    expect(args.where.action).toEqual({ contains: 'tenant', mode: 'insensitive' });
    expect(args.where.tenantId).toBe('t1');
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('clamps pageSize to the maximum', async () => {
    await service.list('super-1', { pageSize: 9999 }, meta);
    const args = prisma.auditLog.findMany.mock.calls[0][0];
    expect(args.take).toBe(100);
  });

  it('records an admin.audit.viewed row and never throws if the write fails', async () => {
    prisma.auditLog.create.mockRejectedValueOnce(new Error('boom'));
    await expect(service.list('super-1', {}, meta)).resolves.toBeDefined();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'admin.audit.viewed', userId: 'super-1' }),
      }),
    );
  });
});
