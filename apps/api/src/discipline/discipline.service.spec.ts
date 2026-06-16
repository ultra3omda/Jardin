import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { TenantContextService } from '../common/tenant/tenant-context.service';
import type { NotificationFanoutService } from '../notifications/notification-fanout.service';
import { DisciplineService } from './discipline.service';

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

const incidentRow = {
  id: 'i1',
  studentId: 's1',
  classId: null,
  type: 'MINOR',
  occurredAt: new Date('2026-05-30'),
  description: 'x',
  sanction: null,
  status: 'OPEN',
  resolutionNote: null,
  resolvedAt: null,
  reportedById: 'u1',
  resolvedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  student: { firstName: 'A', lastName: 'B' },
};

function makePrisma() {
  return {
    disciplineIncident: {
      create: vi.fn().mockResolvedValue(incidentRow),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    parentStudent: {
      findMany: vi.fn().mockResolvedValue([{ studentId: 's1', parentUserId: 'p1' }]),
    },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1', firstName: 'A', lastName: 'B' }) },
    class: { findFirst: vi.fn() },
  };
}

function makeFanout() {
  return { fanoutDisciplineIncident: vi.fn().mockResolvedValue(undefined) };
}

describe('DisciplineService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let fanout: ReturnType<typeof makeFanout>;
  let service: DisciplineService;

  beforeEach(() => {
    prisma = makePrisma();
    fanout = makeFanout();
    service = new DisciplineService(
      prisma as unknown as PrismaService,
      fanout as unknown as NotificationFanoutService,
      {
        runDetached: (fn: () => unknown) => {
          void Promise.resolve().then(fn).catch(() => undefined);
        },
      } as unknown as TenantContextService,
    );
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create(
        { studentId: 's1', type: 'MINOR', occurredAt: '2026-05-30', description: 'x' },
        { ...admin, tenantId: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create fans out to the student parents', async () => {
    await service.create(
      { studentId: 's1', type: 'MAJOR', occurredAt: '2026-05-30', description: 'x' },
      admin,
    );
    // fan-out is fire-and-forget — let the microtask queue flush.
    await new Promise((r) => setImmediate(r));
    expect(fanout.fanoutDisciplineIncident).toHaveBeenCalledWith('t1', 'p1', 'A B', 'MAJOR');
  });

  it('list as PARENT restricts studentId to owned children', async () => {
    await service.list({}, parent);
    const arg = prisma.disciplineIncident.findMany.mock.calls[0]![0] as {
      where: { studentId: unknown };
    };
    expect(arg.where.studentId).toEqual({ in: ['s1'] });
  });

  it('getById of a missing incident throws NotFound', async () => {
    prisma.disciplineIncident.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolve marks the incident RESOLVED with resolver metadata', async () => {
    prisma.disciplineIncident.findFirst.mockResolvedValueOnce({ id: 'i1' });
    prisma.disciplineIncident.update.mockResolvedValueOnce({
      ...incidentRow,
      status: 'RESOLVED',
      resolutionNote: 'done',
      resolvedAt: new Date(),
      resolvedById: 'u1',
    });
    const res = await service.resolve('i1', { resolutionNote: 'done' }, admin);
    expect(res.status).toBe('RESOLVED');
    const arg = prisma.disciplineIncident.update.mock.calls[0]![0] as {
      data: { status: string; resolvedById: string };
    };
    expect(arg.data.status).toBe('RESOLVED');
    expect(arg.data.resolvedById).toBe('u1');
  });
});
