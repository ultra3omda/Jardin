import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { NotificationFanoutService } from '../notifications/notification-fanout.service';
import { InfirmaryVisitsService } from './infirmary-visits.service';

const staff: AuthenticatedUser = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.STAFF };
const parent: AuthenticatedUser = { id: 'p1', email: 'p@t.test', tenantId: 't1', role: UserRole.PARENT };

const visitRow = {
  id: 'v1',
  studentId: 's1',
  visitedAt: new Date('2026-05-30T09:30:00.000Z'),
  reason: 'fièvre',
  treatment: null,
  temperature: null,
  outcome: 'EMERGENCY',
  recordedById: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  student: { firstName: 'A', lastName: 'B' },
};

function makePrisma() {
  return {
    infirmaryVisit: {
      create: vi.fn().mockResolvedValue(visitRow),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    parentStudent: {
      findMany: vi.fn().mockResolvedValue([{ studentId: 's1', parentUserId: 'p1' }]),
    },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1', firstName: 'A', lastName: 'B' }) },
  };
}

function makeFanout() {
  return { fanoutInfirmaryVisit: vi.fn().mockResolvedValue(undefined) };
}

describe('InfirmaryVisitsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let fanout: ReturnType<typeof makeFanout>;
  let service: InfirmaryVisitsService;

  beforeEach(() => {
    prisma = makePrisma();
    fanout = makeFanout();
    service = new InfirmaryVisitsService(
      prisma as unknown as PrismaService,
      fanout as unknown as NotificationFanoutService,
    );
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create(
        { studentId: 's1', visitedAt: '2026-05-30T09:30:00.000Z', reason: 'x' },
        { ...staff, tenantId: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fans out to parents when the outcome is EMERGENCY', async () => {
    await service.create(
      { studentId: 's1', visitedAt: '2026-05-30T09:30:00.000Z', reason: 'x', outcome: 'EMERGENCY' },
      staff,
    );
    await new Promise((r) => setImmediate(r));
    expect(fanout.fanoutInfirmaryVisit).toHaveBeenCalledWith('t1', 'p1', 'A B', 'EMERGENCY');
  });

  it('does NOT fan out when the outcome is RETURNED_TO_CLASS', async () => {
    prisma.infirmaryVisit.create.mockResolvedValueOnce({ ...visitRow, outcome: 'RETURNED_TO_CLASS' });
    await service.create(
      {
        studentId: 's1',
        visitedAt: '2026-05-30T09:30:00.000Z',
        reason: 'x',
        outcome: 'RETURNED_TO_CLASS',
      },
      staff,
    );
    await new Promise((r) => setImmediate(r));
    expect(fanout.fanoutInfirmaryVisit).not.toHaveBeenCalled();
  });

  it('list as PARENT restricts studentId to owned children', async () => {
    await service.list({}, parent);
    const arg = prisma.infirmaryVisit.findMany.mock.calls[0]![0] as {
      where: { studentId: unknown };
    };
    expect(arg.where.studentId).toEqual({ in: ['s1'] });
  });

  it('getById of a missing visit throws NotFound', async () => {
    prisma.infirmaryVisit.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', staff)).rejects.toBeInstanceOf(NotFoundException);
  });
});
