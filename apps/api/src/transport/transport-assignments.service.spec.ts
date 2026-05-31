import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { TransportAssignmentsService } from './transport-assignments.service';

const staff: AuthenticatedUser = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.STAFF };
const parent: AuthenticatedUser = { id: 'p1', email: 'p@t.test', tenantId: 't1', role: UserRole.PARENT };

const assignmentRow = {
  id: 'a1',
  studentId: 's1',
  routeId: 'r1',
  stopId: null,
  direction: 'BOTH',
  createdAt: new Date(),
  student: { firstName: 'A', lastName: 'B' },
  route: { name: 'Ligne A' },
  stop: null,
};

function makePrisma() {
  return {
    transportAssignment: {
      create: vi.fn().mockResolvedValue(assignmentRow),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    parentStudent: { findMany: vi.fn().mockResolvedValue([{ studentId: 's1' }]) },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1' }) },
    busRoute: { findFirst: vi.fn().mockResolvedValue({ id: 'r1' }) },
    busStop: { findFirst: vi.fn().mockResolvedValue({ id: 'st1' }) },
  };
}

describe('TransportAssignmentsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: TransportAssignmentsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new TransportAssignmentsService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create({ studentId: 's1', routeId: 'r1' }, { ...staff, tenantId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list as PARENT restricts studentId to owned children', async () => {
    await service.list({}, parent);
    const arg = prisma.transportAssignment.findMany.mock.calls[0]![0] as {
      where: { studentId: unknown };
    };
    expect(arg.where.studentId).toEqual({ in: ['s1'] });
  });

  it('create maps a duplicate assignment to ASSIGNMENT_ALREADY_EXISTS', async () => {
    prisma.transportAssignment.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
    );
    await expect(service.create({ studentId: 's1', routeId: 'r1' }, staff)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('getById of a missing assignment throws NotFound', async () => {
    prisma.transportAssignment.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', staff)).rejects.toBeInstanceOf(NotFoundException);
  });
});
