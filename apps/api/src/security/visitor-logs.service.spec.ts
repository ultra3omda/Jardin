import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { VisitorLogsService } from './visitor-logs.service';

const staff: AuthenticatedUser = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.STAFF };

function makePrisma() {
  return {
    visitorLog: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('VisitorLogsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: VisitorLogsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new VisitorLogsService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create(
        { visitorName: 'M. Gharbi', checkInAt: '2026-05-30T08:15:00.000Z' },
        { ...staff, tenantId: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list scopes to the tenant', async () => {
    await service.list(staff);
    const arg = prisma.visitorLog.findMany.mock.calls[0]![0] as { where: { tenantId: string } };
    expect(arg.where.tenantId).toBe('t1');
  });

  it('getById of a missing log throws NotFound', async () => {
    prisma.visitorLog.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', staff)).rejects.toBeInstanceOf(NotFoundException);
  });
});
