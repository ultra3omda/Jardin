import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { BulletinPdfService } from './bulletin-pdf.service';
import { BulletinsService } from './bulletins.service';

const adminUser = {
  id: 'u_admin', tenantId: 't_demo', role: 'SCHOOL_ADMIN', email: 'admin@demo.tn',
} as AuthenticatedUser;

function buildPrismaMock() {
  return {
    student: { findFirst: vi.fn() },
    gradePeriod: { findFirst: vi.fn() },
    tenant: { findUnique: vi.fn() },
    evaluation: { findMany: vi.fn() },
    bulletin: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
  };
}

function buildPdfMock() {
  return {
    render: vi.fn(async () => Buffer.from('%PDF-1.4 mock')),
  };
}

describe('BulletinsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let pdf: ReturnType<typeof buildPdfMock>;
  let service: BulletinsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    pdf = buildPdfMock();
    service = new BulletinsService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma as any,
      pdf as unknown as BulletinPdfService,
    );
  });

  it('throws when student not in tenant', async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    await expect(service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, adminUser))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when period not found', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'st1', firstName: 'Lina', lastName: 'B', classroom: 'CP-A' });
    prisma.gradePeriod.findFirst.mockResolvedValue(null);
    await expect(service.generate({ studentId: 'st1', gradePeriodId: 'p_missing' }, adminUser))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('computes per-subject and overall averages correctly', async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: 'st1', firstName: 'Lina', lastName: 'Bouaziz', classroom: 'CP-A',
    });
    prisma.gradePeriod.findFirst.mockResolvedValue({
      id: 'p1', name: 'T1', schoolYear: '2025-2026',
    });
    prisma.tenant.findUnique.mockResolvedValue({ id: 't_demo', name: 'École Demo' });
    prisma.evaluation.findMany.mockResolvedValue([
      {
        id: 'e1', subjectId: 'sub-math', maxScore: 20, title: 'Contrôle 1', date: new Date('2025-09-15'),
        subject: { id: 'sub-math', name: 'Mathématiques' },
        grades: [{ id: 'g1', studentId: 'st1', score: 10 }],
      },
      {
        id: 'e2', subjectId: 'sub-math', maxScore: 20, title: 'Contrôle 2', date: new Date('2025-10-15'),
        subject: { id: 'sub-math', name: 'Mathématiques' },
        grades: [{ id: 'g2', studentId: 'st1', score: 16 }],
      },
      {
        id: 'e3', subjectId: 'sub-fr', maxScore: 20, title: 'Dictée', date: new Date('2025-09-20'),
        subject: { id: 'sub-fr', name: 'Français' },
        grades: [{ id: 'g3', studentId: 'st1', score: 15 }],
      },
    ]);
    prisma.bulletin.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({
      ...create,
      generatedAt: new Date(),
    }));

    const result = await service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, adminUser);

    expect(result.snapshot.overallAverage).toBeCloseTo(14, 5);
    expect(result.snapshot.subjects).toHaveLength(2);
    const math = result.snapshot.subjects.find((s) => s.subjectId === 'sub-math');
    expect(math?.average).toBeCloseTo(13, 5);
    expect(math?.grades).toHaveLength(2);
    expect(result.pdf).toBeInstanceOf(Buffer);
    expect(pdf.render).toHaveBeenCalledTimes(1);
  });

  it('handles student with zero grades — overallAverage null, empty subjects', async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: 'st1', firstName: 'L', lastName: 'B', classroom: 'CP-A',
    });
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', name: 'T1', schoolYear: '2025-2026' });
    prisma.tenant.findUnique.mockResolvedValue({ id: 't_demo', name: 'École Demo' });
    prisma.evaluation.findMany.mockResolvedValue([]);
    prisma.bulletin.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({
      ...create,
      generatedAt: new Date(),
    }));

    const result = await service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, adminUser);
    expect(result.snapshot.overallAverage).toBeNull();
    expect(result.snapshot.subjects).toHaveLength(0);
  });

  it('ignores evaluations whose student has no grade row', async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: 'st1', firstName: 'L', lastName: 'B', classroom: 'CP-A',
    });
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', name: 'T1', schoolYear: '2025-2026' });
    prisma.tenant.findUnique.mockResolvedValue({ id: 't_demo', name: 'École Demo' });
    prisma.evaluation.findMany.mockResolvedValue([
      {
        id: 'e1', subjectId: 'sub-math', maxScore: 20, title: 'Contrôle 1', date: new Date('2025-09-15'),
        subject: { id: 'sub-math', name: 'Mathématiques' },
        grades: [],
      },
    ]);
    prisma.bulletin.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({
      ...create,
      generatedAt: new Date(),
    }));

    const result = await service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, adminUser);
    expect(result.snapshot.subjects).toHaveLength(0);
    expect(result.snapshot.overallAverage).toBeNull();
  });

  it('rejects when tenantId is missing', async () => {
    const noTenant = { ...adminUser, tenantId: null } as AuthenticatedUser;
    await expect(service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, noTenant))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
