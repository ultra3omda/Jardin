/* eslint-disable @typescript-eslint/no-explicit-any */
import { ForbiddenException } from '@nestjs/common';
import { AttendanceStatus, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';

const parent: AuthenticatedUser = {
  id: 'u_par', email: 'p@demo.tn', tenantId: 't1', role: UserRole.PARENT,
};

function buildPrisma() {
  return {
    parentStudent: { findMany: vi.fn().mockResolvedValue([]) },
    attendance: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('AttendanceService.myChildrenAttendance', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: AttendanceService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new AttendanceService(
      prisma as any,
      { fanoutAbsence: vi.fn() } as any,
      { runDetached: (fn: () => unknown) => { void Promise.resolve().then(fn).catch(() => undefined); } } as any,
    );
  });

  it('returns empty when the parent has no children', async () => {
    const res = await service.myChildrenAttendance(parent);
    expect(res).toEqual({ items: [], total: 0 });
    expect(prisma.attendance.findMany).not.toHaveBeenCalled();
  });

  it("scopes attendance to the parent's children and maps names", async () => {
    prisma.parentStudent.findMany.mockResolvedValue([
      { student: { id: 's1', firstName: 'Lina', lastName: 'Ben Ali' } },
      { student: { id: 's2', firstName: 'Karim', lastName: 'Ben Ali' } },
    ]);
    prisma.attendance.findMany.mockResolvedValue([
      { studentId: 's1', date: new Date('2026-06-02'), status: AttendanceStatus.PRESENT, notes: null },
      { studentId: 's2', date: new Date('2026-06-01'), status: AttendanceStatus.ABSENT, notes: 'malade' },
    ]);

    const res = await service.myChildrenAttendance(parent);

    // Query restricted to the parent's children ids.
    expect(prisma.attendance.findMany.mock.calls[0][0].where.studentId).toEqual({ in: ['s1', 's2'] });
    expect(res.total).toBe(2);
    expect(res.items[0]).toMatchObject({ studentName: 'Lina Ben Ali', status: 'PRESENT', date: '2026-06-02' });
    expect(res.items[1]).toMatchObject({ studentName: 'Karim Ben Ali', status: 'ABSENT', notes: 'malade' });
  });

  it('throws ForbiddenException without a tenant', async () => {
    await expect(
      service.myChildrenAttendance({ ...parent, tenantId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
