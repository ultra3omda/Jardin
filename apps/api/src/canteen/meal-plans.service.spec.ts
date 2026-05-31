import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { MealPlansService } from './meal-plans.service';

const staff: AuthenticatedUser = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.STAFF };
const parent: AuthenticatedUser = { id: 'p1', email: 'p@t.test', tenantId: 't1', role: UserRole.PARENT };

function makePrisma() {
  return {
    mealPlan: {
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

describe('MealPlansService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: MealPlansService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new MealPlansService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create({ studentId: 's1' }, { ...staff, tenantId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list as PARENT restricts studentId to owned children', async () => {
    await service.list({}, parent);
    const arg = prisma.mealPlan.findMany.mock.calls[0]![0] as { where: { studentId: unknown } };
    expect(arg.where.studentId).toEqual({ in: ['s1'] });
  });

  it('create maps a duplicate student to MEAL_PLAN_ALREADY_EXISTS', async () => {
    prisma.mealPlan.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
    );
    await expect(service.create({ studentId: 's1' }, staff)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('getById of a missing plan throws NotFound', async () => {
    prisma.mealPlan.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', staff)).rejects.toBeInstanceOf(NotFoundException);
  });
});
