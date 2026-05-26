import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { SubjectsService } from './subjects.service';

const adminUser: AuthenticatedUser = {
  id: 'u_admin',
  tenantId: 't_demo',
  role: 'SCHOOL_ADMIN',
  email: 'admin@demo.tn',
} as AuthenticatedUser;

function buildPrismaMock() {
  return {
    subject: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('SubjectsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: SubjectsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new SubjectsService(prisma as any);
  });

  it('rejects creation when tenantId is missing', async () => {
    const noTenant = { ...adminUser, tenantId: null } as AuthenticatedUser;
    await expect(service.create({ name: 'Math' }, noTenant)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a subject scoped to tenant', async () => {
    prisma.subject.create.mockResolvedValue({
      id: 's1', tenantId: 't_demo', name: 'Math', code: null,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    const res = await service.create({ name: 'Math' }, adminUser);
    expect(res.id).toBe('s1');
    expect(res.name).toBe('Math');
    expect(prisma.subject.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 't_demo', name: 'Math' }),
    }));
  });

  it('maps Prisma unique-violation to SUBJECT_ALREADY_EXISTS', async () => {
    prisma.subject.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5' }),
    );
    await expect(service.create({ name: 'Math' }, adminUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists only non-deleted subjects for the tenant', async () => {
    prisma.subject.findMany.mockResolvedValue([{
      id: 's1', tenantId: 't_demo', name: 'Math', code: null,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    }]);
    prisma.subject.count.mockResolvedValue(1);
    const res = await service.list(adminUser);
    expect(res.total).toBe(1);
    expect(prisma.subject.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 't_demo', deletedAt: null }),
    }));
  });

  it('throws NotFound when soft-deleting an unknown subject', async () => {
    prisma.subject.findFirst.mockResolvedValue(null);
    await expect(service.remove('s_missing', adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });
});
