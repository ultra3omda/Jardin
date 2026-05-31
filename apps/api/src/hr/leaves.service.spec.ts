import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { LeavesService, computeBalance, computeLeaveDays } from './leaves.service';

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

const leaveRow = {
  id: 'l1',
  tenantId: 't1',
  userId: 'teach1',
  type: 'PAID',
  status: 'PENDING',
  startDate: new Date('2026-07-01T00:00:00.000Z'),
  endDate: new Date('2026-07-10T00:00:00.000Z'),
  reason: null,
  reviewNote: null,
  reviewedById: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrisma() {
  return {
    leaveRequest: {
      create: vi.fn().mockResolvedValue(leaveRow),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: { findFirst: vi.fn().mockResolvedValue({ id: 'teach1' }) },
  };
}

describe('leave pure helpers', () => {
  it('computeLeaveDays counts inclusive calendar days', () => {
    expect(
      computeLeaveDays(new Date('2026-07-01T00:00:00Z'), new Date('2026-07-01T00:00:00Z')),
    ).toBe(1);
    expect(
      computeLeaveDays(new Date('2026-07-01T00:00:00Z'), new Date('2026-07-10T00:00:00Z')),
    ).toBe(10);
  });

  it('computeBalance subtracts taken from allowance', () => {
    const res = computeBalance(
      [{ startDate: new Date('2026-07-01T00:00:00Z'), endDate: new Date('2026-07-05T00:00:00Z') }],
      24,
    );
    expect(res.takenDays).toBe(5);
    expect(res.remainingDays).toBe(19);
  });
});

describe('LeavesService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: LeavesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new LeavesService(prisma as unknown as PrismaService);
  });

  it('create rejects endDate before startDate', async () => {
    await expect(
      service.create(
        { type: 'PAID', startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-01T00:00:00.000Z' },
        teacher,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a teacher filing leave is confined to their own userId', async () => {
    await service.create(
      {
        userId: 'someone-else',
        type: 'PAID',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-03T00:00:00.000Z',
      },
      teacher,
    );
    const arg = prisma.leaveRequest.create.mock.calls[0]![0] as { data: { userId: string } };
    expect(arg.data.userId).toBe('teach1');
  });

  it('a teacher cannot review (403)', async () => {
    await expect(service.review('l1', { status: 'APPROVED' }, teacher)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('an admin cannot review their own leave (403)', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValueOnce({ ...leaveRow, userId: 'admin1' });
    await expect(service.review('l1', { status: 'APPROVED' }, admin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('an admin approves an employee leave (sets reviewedById + status)', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValueOnce(leaveRow);
    prisma.leaveRequest.update.mockResolvedValueOnce({
      ...leaveRow,
      status: 'APPROVED',
      reviewedById: 'admin1',
      reviewedAt: new Date(),
    });
    const res = await service.review('l1', { status: 'APPROVED' }, admin);
    expect(res.status).toBe('APPROVED');
    const arg = prisma.leaveRequest.update.mock.calls[0]![0] as {
      data: { status: string; reviewedById: string };
    };
    expect(arg.data.status).toBe('APPROVED');
    expect(arg.data.reviewedById).toBe('admin1');
  });

  it('a teacher reading another employee leave gets NotFound', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValueOnce({ ...leaveRow, userId: 'other' });
    await expect(service.getById('l1', teacher)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('balance sums approved PAID days for the year', async () => {
    prisma.leaveRequest.findMany.mockResolvedValueOnce([
      { startDate: new Date('2026-07-01T00:00:00Z'), endDate: new Date('2026-07-05T00:00:00Z') },
    ]);
    const res = await service.balance({ year: 2026 }, teacher);
    expect(res.takenDays).toBe(5);
    expect(res.remainingDays).toBe(24 - 5);
    const arg = prisma.leaveRequest.findMany.mock.calls[0]![0] as {
      where: { userId: string; status: string; type: string };
    };
    expect(arg.where.userId).toBe('teach1');
    expect(arg.where.status).toBe('APPROVED');
    expect(arg.where.type).toBe('PAID');
  });
});
