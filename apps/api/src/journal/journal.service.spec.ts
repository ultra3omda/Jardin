import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { JournalService } from './journal.service';

const admin: AuthenticatedUser = {
  id: 'u1',
  email: 'a@t.test',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};
const parent: AuthenticatedUser = {
  id: 'p1',
  email: 'p@t.test',
  tenantId: 't1',
  role: UserRole.PARENT,
};

function makePrisma() {
  return {
    dailyLogEntry: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    parentStudent: { findMany: vi.fn().mockResolvedValue([{ studentId: 's1' }]) },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1', firstName: 'A', lastName: 'B' }) },
  };
}

describe('JournalService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: JournalService;
  beforeEach(() => {
    prisma = makePrisma();
    service = new JournalService(prisma as unknown as PrismaService);
  });

  it('list as PARENT restricts studentId to owned children', async () => {
    await service.list({}, parent);
    expect(prisma.parentStudent.findMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', parentUserId: 'p1' },
      select: { studentId: true },
    });
    const arg = prisma.dailyLogEntry.findMany.mock.calls[0][0];
    expect(arg.where.studentId).toEqual({ in: ['s1'] });
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create({ studentId: 's1', date: '2026-05-30' }, { ...admin, tenantId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getById of a missing entry throws NotFound', async () => {
    prisma.dailyLogEntry.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', admin)).rejects.toBeInstanceOf(NotFoundException);
  });
});
