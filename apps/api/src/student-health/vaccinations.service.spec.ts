import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { VaccinationsService } from './vaccinations.service';

const admin: AuthenticatedUser = {
  id: 'u1',
  email: 'a@t.test',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};
const parent: AuthenticatedUser = { id: 'p1', email: 'p@t.test', tenantId: 't1', role: UserRole.PARENT };

function makePrisma() {
  return {
    vaccination: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    parentStudent: { findMany: vi.fn().mockResolvedValue([{ studentId: 's1' }]) },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1' }) },
  };
}

describe('VaccinationsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: VaccinationsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new VaccinationsService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create(
        { studentId: 's1', vaccineName: 'DTP', administeredAt: '2025-09-15' },
        { ...admin, tenantId: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list as PARENT restricts studentId to owned children', async () => {
    await service.list({}, parent);
    const arg = prisma.vaccination.findMany.mock.calls[0]![0] as { where: { studentId: unknown } };
    expect(arg.where.studentId).toEqual({ in: ['s1'] });
  });

  it('getById of a missing vaccination throws NotFound', async () => {
    prisma.vaccination.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', admin)).rejects.toBeInstanceOf(NotFoundException);
  });
});
