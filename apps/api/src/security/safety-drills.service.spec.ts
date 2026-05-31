import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { SafetyDrillsService } from './safety-drills.service';

const admin: AuthenticatedUser = {
  id: 'u1',
  email: 'a@t.test',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};

function makePrisma() {
  return {
    safetyDrill: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('SafetyDrillsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: SafetyDrillsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SafetyDrillsService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create(
        { type: 'FIRE', conductedAt: '2026-05-30T11:00:00.000Z' },
        { ...admin, tenantId: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list scopes to the tenant', async () => {
    await service.list(admin);
    const arg = prisma.safetyDrill.findMany.mock.calls[0]![0] as { where: { tenantId: string } };
    expect(arg.where.tenantId).toBe('t1');
  });

  it('getById of a missing drill throws NotFound', async () => {
    prisma.safetyDrill.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', admin)).rejects.toBeInstanceOf(NotFoundException);
  });
});
