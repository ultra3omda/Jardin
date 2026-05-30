import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { HealthRecordsService } from './health-records.service';

const staff: AuthenticatedUser = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.STAFF };
const parent: AuthenticatedUser = { id: 'p1', email: 'p@t.test', tenantId: 't1', role: UserRole.PARENT };

function makePrisma() {
  return {
    healthRecord: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    parentStudent: { findMany: vi.fn().mockResolvedValue([{ studentId: 's1' }]) },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1' }) },
  };
}

describe('HealthRecordsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: HealthRecordsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new HealthRecordsService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create({ studentId: 's1' }, { ...staff, tenantId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list as PARENT restricts studentId to owned children', async () => {
    await service.list({}, parent);
    const arg = prisma.healthRecord.findMany.mock.calls[0]![0] as { where: { studentId: unknown } };
    expect(arg.where.studentId).toEqual({ in: ['s1'] });
  });

  it('getById of a missing record throws NotFound', async () => {
    prisma.healthRecord.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', staff)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create maps a unique-constraint violation to HEALTH_RECORD_ALREADY_EXISTS', async () => {
    prisma.healthRecord.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
    );
    await expect(service.create({ studentId: 's1' }, staff)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
