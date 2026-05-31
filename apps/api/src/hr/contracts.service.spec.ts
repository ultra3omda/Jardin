import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { ContractsService } from './contracts.service';

const admin: AuthenticatedUser = {
  id: 'admin1',
  email: 'admin@t.test',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};
const teacher: AuthenticatedUser = {
  id: 'teach1',
  email: 'teach@t.test',
  tenantId: 't1',
  role: UserRole.TEACHER,
};

const contractRow = {
  id: 'c1',
  tenantId: 't1',
  userId: 'teach1',
  type: 'CDI',
  status: 'ACTIVE',
  startDate: new Date('2026-09-01T00:00:00.000Z'),
  endDate: null,
  baseSalary: new Prisma.Decimal('2200.500'),
  currency: 'TND',
  weeklyHours: 35,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrisma() {
  return {
    employmentContract: {
      create: vi.fn().mockResolvedValue(contractRow),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue({ id: 'teach1' }),
    },
  };
}

describe('ContractsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ContractsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ContractsService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create(
        { userId: 'teach1', type: 'CDI', startDate: '2026-09-01T00:00:00.000Z', baseSalary: 2200 },
        { ...admin, tenantId: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create serializes baseSalary as a Decimal string in the response', async () => {
    const res = await service.create(
      { userId: 'teach1', type: 'CDI', startDate: '2026-09-01T00:00:00.000Z', baseSalary: 2200.5 },
      admin,
    );
    expect(res.baseSalary).toBe('2200.5');
    const arg = prisma.employmentContract.create.mock.calls[0]![0] as {
      data: { baseSalary: Prisma.Decimal };
    };
    expect(arg.data.baseSalary).toBeInstanceOf(Prisma.Decimal);
  });

  it('a non-admin (teacher) cannot create a contract (403)', async () => {
    await expect(
      service.create(
        { userId: 'teach1', type: 'CDI', startDate: '2026-09-01T00:00:00.000Z', baseSalary: 2200 },
        teacher,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list confines a teacher to their own userId regardless of the query', async () => {
    await service.list({ userId: 'someone-else' }, teacher);
    const arg = prisma.employmentContract.findMany.mock.calls[0]![0] as {
      where: { userId: string; tenantId: string };
    };
    expect(arg.where.userId).toBe('teach1');
    expect(arg.where.tenantId).toBe('t1');
  });

  it('admin list honors the userId filter', async () => {
    await service.list({ userId: 'teach1' }, admin);
    const arg = prisma.employmentContract.findMany.mock.calls[0]![0] as {
      where: { userId?: string };
    };
    expect(arg.where.userId).toBe('teach1');
  });

  it('a teacher reading another employee contract gets NotFound', async () => {
    prisma.employmentContract.findFirst.mockResolvedValueOnce({ ...contractRow, userId: 'other' });
    await expect(service.getById('c1', teacher)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('end sets status ENDED and stamps endDate when missing', async () => {
    prisma.employmentContract.findFirst.mockResolvedValueOnce({ ...contractRow, endDate: null });
    prisma.employmentContract.update.mockResolvedValueOnce({ ...contractRow, status: 'ENDED' });
    const res = await service.end('c1', admin);
    expect(res.status).toBe('ENDED');
    const arg = prisma.employmentContract.update.mock.calls[0]![0] as {
      data: { status: string; endDate: Date };
    };
    expect(arg.data.status).toBe('ENDED');
    expect(arg.data.endDate).toBeInstanceOf(Date);
  });
});
