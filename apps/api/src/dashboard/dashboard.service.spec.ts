/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { DashboardService } from './dashboard.service';

const TENANT = 't1';
const admin: AuthenticatedUser = { id: 'u_admin', email: 'a@s.tn', tenantId: TENANT, role: UserRole.SCHOOL_ADMIN };
const teacher: AuthenticatedUser = { id: 'u_teach', email: 't@s.tn', tenantId: TENANT, role: UserRole.TEACHER };
const parent: AuthenticatedUser = { id: 'u_par', email: 'p@s.tn', tenantId: TENANT, role: UserRole.PARENT };

function makePrisma() {
  return {
    classTeacher: { findMany: vi.fn().mockResolvedValue([{ classId: 'c1' }]) },
    parentStudent: { findMany: vi.fn().mockResolvedValue([]) },
    student: { count: vi.fn().mockResolvedValue(16) },
    class: { count: vi.fn().mockResolvedValue(3) },
    invoice: {
      count: vi.fn().mockResolvedValue(7),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 1200 } }),
    },
    grade: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    attendance: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    announcement: { findMany: vi.fn().mockResolvedValue([]) },
    dailyLogEntry: { findFirst: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0) },
    activity: { count: vi.fn().mockResolvedValue(0) },
  };
}

describe('DashboardService.overview', () => {
  let service: DashboardService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const mod = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(DashboardService);
  });

  it('scopes a TEACHER to their classes and hides finance', async () => {
    const res = await service.overview(teacher);
    // student.count called with classId scope
    expect(prisma.student.count.mock.calls[0][0].where.classId).toEqual({ in: ['c1'] });
    // classes = number of assigned classes (1), not the tenant total (3)
    expect(res.classesCount).toBe(1);
    // finance hidden for teachers
    expect(res.pendingPayments).toBe(0);
    // grade aggregation scoped via evaluation.classId
    expect(prisma.grade.findMany.mock.calls[0][0].where.evaluation).toEqual({ classId: { in: ['c1'] } });
  });

  it('keeps the tenant-wide view (with finance) for an admin', async () => {
    const res = await service.overview(admin);
    expect(prisma.classTeacher.findMany).not.toHaveBeenCalled();
    expect(prisma.student.count.mock.calls[0][0].where.classId).toBeUndefined();
    expect(res.classesCount).toBe(3);
    expect(res.pendingPayments).toBe(7);
  });

  it('scopes a PARENT to their own children and returns parent figures', async () => {
    prisma.parentStudent.findMany.mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]);
    prisma.invoice.count.mockResolvedValue(2);
    prisma.invoice.aggregate.mockResolvedValue({ _sum: { amount: 640 } });
    prisma.grade.count.mockResolvedValue(3);

    const res = await service.overview(parent);

    // Children resolved via ParentStudent, not class assignments.
    expect(prisma.classTeacher.findMany).not.toHaveBeenCalled();
    expect(prisma.student.count.mock.calls[0][0].where.id).toEqual({ in: ['s1', 's2'] });
    expect(prisma.grade.findMany.mock.calls[0][0].where.studentId).toEqual({ in: ['s1', 's2'] });
    expect(prisma.invoice.count.mock.calls[0][0].where.studentId).toEqual({ in: ['s1', 's2'] });
    // Parent-specific figures surface real values (no more dashes).
    expect(res.pendingPayments).toBe(2);
    expect(res.amountDue).toBe(640);
    expect(res.newGrades).toBe(3);
  });

  it('returns empty for a user without a tenant', async () => {
    const res = await service.overview({ ...admin, tenantId: null });
    expect(res.totalStudents).toBe(0);
    expect(prisma.student.count).not.toHaveBeenCalled();
  });
});
