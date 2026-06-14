import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { GradePeriodsService } from './grade-periods.service';

const adminUser = {
  id: 'u_admin', tenantId: 't_demo', role: 'SCHOOL_ADMIN', email: 'admin@demo.tn',
} as AuthenticatedUser;

function buildPrismaMock() {
  return {
    gradePeriod: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    evaluation: { count: vi.fn() },
    bulletin: { count: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('GradePeriodsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: GradePeriodsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new GradePeriodsService(prisma as any);
  });

  it('rejects period with endDate <= startDate', async () => {
    const dto = {
      name: 'T1',
      schoolYear: '2025-2026',
      startDate: '2025-09-10',
      endDate: '2025-09-01',
    };
    await expect(service.create(dto, adminUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects schoolYear not in YYYY-YYYY format', async () => {
    const dto = {
      name: 'T1',
      schoolYear: '2025',
      startDate: '2025-09-01',
      endDate: '2025-12-15',
    };
    await expect(service.create(dto, adminUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a valid period', async () => {
    prisma.gradePeriod.create.mockResolvedValue({
      id: 'p1', tenantId: 't_demo', name: 'T1', schoolYear: '2025-2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'),
      isClosed: false, createdAt: new Date(), updatedAt: new Date(),
    });
    const res = await service.create({
      name: 'T1', schoolYear: '2025-2026',
      startDate: '2025-09-01', endDate: '2025-12-15',
    }, adminUser);
    expect(res.name).toBe('T1');
    expect(res.isClosed).toBe(false);
  });

  it('maps unique-violation to PERIOD_ALREADY_EXISTS', async () => {
    prisma.gradePeriod.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
    );
    await expect(service.create({
      name: 'T1', schoolYear: '2025-2026',
      startDate: '2025-09-01', endDate: '2025-12-15',
    }, adminUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('close() flips isClosed=true', async () => {
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', isClosed: false });
    prisma.gradePeriod.update.mockResolvedValue({
      id: 'p1', tenantId: 't_demo', name: 'T1', schoolYear: '2025-2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'),
      isClosed: true, createdAt: new Date(), updatedAt: new Date(),
    });
    const res = await service.close('p1', adminUser);
    expect(res.isClosed).toBe(true);
  });

  it('close() throws NotFound on unknown period', async () => {
    prisma.gradePeriod.findFirst.mockResolvedValue(null);
    await expect(service.close('p_missing', adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove() deletes a period with no dependents', async () => {
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', tenantId: 't_demo' });
    prisma.evaluation.count.mockResolvedValue(0);
    prisma.bulletin.count.mockResolvedValue(0);
    prisma.gradePeriod.delete.mockResolvedValue({ id: 'p1' });
    await service.remove('p1', adminUser);
    expect(prisma.gradePeriod.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('remove() throws when the period has evaluations or bulletins', async () => {
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', tenantId: 't_demo' });
    prisma.evaluation.count.mockResolvedValue(3);
    prisma.bulletin.count.mockResolvedValue(0);
    await expect(service.remove('p1', adminUser)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.gradePeriod.delete).not.toHaveBeenCalled();
  });

  it('remove() throws NotFound on unknown period', async () => {
    prisma.gradePeriod.findFirst.mockResolvedValue(null);
    await expect(service.remove('p_missing', adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });
});
