import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { BusRoutesService } from './bus-routes.service';

const staff: AuthenticatedUser = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.STAFF };

const routeRow = {
  id: 'r1',
  name: 'Ligne A',
  driverName: null,
  driverPhone: null,
  vehiclePlate: null,
  departureTime: '07:15',
  returnTime: null,
  status: 'ACTIVE',
  capacity: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  stops: [],
  _count: { assignments: 0 },
};

function makePrisma() {
  const busStop = { createMany: vi.fn().mockResolvedValue({ count: 2 }) };
  const busRoute = {
    create: vi.fn().mockResolvedValue({ id: 'r1' }),
    findFirst: vi.fn().mockResolvedValue(routeRow),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    update: vi.fn(),
  };
  return {
    busRoute,
    busStop,
    // $transaction(fn) runs the callback with a tx client exposing the same mocks.
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ busRoute, busStop })),
  };
}

describe('BusRoutesService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: BusRoutesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new BusRoutesService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create({ name: 'L', departureTime: '07:15' }, { ...staff, tenantId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create with stops runs a transaction and creates the stops', async () => {
    await service.create(
      {
        name: 'Ligne A',
        departureTime: '07:15',
        stops: [
          { name: 'Arrêt 1', order: 0 },
          { name: 'Arrêt 2', order: 1 },
        ],
      },
      staff,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.busStop.createMany).toHaveBeenCalledTimes(1);
    const arg = prisma.busStop.createMany.mock.calls[0]![0] as { data: unknown[] };
    expect(arg.data).toHaveLength(2);
  });

  it('getById of a missing route throws NotFound', async () => {
    prisma.busRoute.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', staff)).rejects.toBeInstanceOf(NotFoundException);
  });
});
