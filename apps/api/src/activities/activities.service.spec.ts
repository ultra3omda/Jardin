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
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1', firstName: 'A', lastName: 'B' }) },
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
});
