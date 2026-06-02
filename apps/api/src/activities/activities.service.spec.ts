import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from './activities.service';

const admin: AuthenticatedUser = {
  id: 'u1',
  email: 'a@t.test',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};

function makePrisma() {
  return {
    activity: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    activityParticipation: {
      create: vi.fn(),
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1', firstName: 'A', lastName: 'B' }) },
    class: { findFirst: vi.fn().mockResolvedValue({ id: 'c1' }) },
    attendance: { findMany: vi.fn().mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]) },
    parentStudent: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('ActivitiesService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ActivitiesService;
  beforeEach(() => {
    prisma = makePrisma();
    service = new ActivitiesService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(service.create({ name: 'Chorale' }, { ...admin, tenantId: null }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('addParticipation throws NotFound when the student is not in the tenant', async () => {
    prisma.activity.findFirst.mockResolvedValueOnce({ id: 'a1', tenantId: 't1' });
    prisma.student.findFirst.mockResolvedValueOnce(null);
    await expect(service.addParticipation('a1', { studentId: 'x' }, admin))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('fillFromAttendance upserts a participation for each present student of the class', async () => {
    prisma.activity.findFirst.mockResolvedValue({ id: 'a1', classId: 'c1' });
    await service.fillFromAttendance('a1', '2026-06-02', admin);
    // 2 présents → 2 upserts
    expect(prisma.activityParticipation.upsert).toHaveBeenCalledTimes(2);
    const attWhere = prisma.attendance.findMany.mock.calls[0][0].where;
    expect(attWhere.classId).toBe('c1');
    expect(attWhere.status).toBe('PRESENT');
  });

  it('fillFromAttendance rejects an activity without a class', async () => {
    prisma.activity.findFirst.mockResolvedValueOnce({ id: 'a1', classId: null });
    await expect(service.fillFromAttendance('a1', undefined, admin)).rejects.toMatchObject({
      response: { code: 'ACTIVITY_HAS_NO_CLASS' },
    });
  });
});
