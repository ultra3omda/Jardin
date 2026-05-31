import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { CanteenMenusService } from './canteen-menus.service';

const staff: AuthenticatedUser = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.STAFF };

function makePrisma() {
  return {
    canteenMenu: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('CanteenMenusService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: CanteenMenusService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CanteenMenusService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create({ date: '2026-05-30' }, { ...staff, tenantId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list scopes to the tenant and supports a date range', async () => {
    await service.list({ from: '2026-05-25', to: '2026-05-31' }, staff);
    const arg = prisma.canteenMenu.findMany.mock.calls[0]![0] as {
      where: { tenantId: string; date: { gte: Date; lte: Date } };
    };
    expect(arg.where.tenantId).toBe('t1');
    expect(arg.where.date.gte).toBeInstanceOf(Date);
    expect(arg.where.date.lte).toBeInstanceOf(Date);
  });

  it('create maps a duplicate date to CANTEEN_MENU_ALREADY_EXISTS', async () => {
    prisma.canteenMenu.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
    );
    await expect(service.create({ date: '2026-05-30' }, staff)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('getById of a missing menu throws NotFound', async () => {
    prisma.canteenMenu.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', staff)).rejects.toBeInstanceOf(NotFoundException);
  });
});
