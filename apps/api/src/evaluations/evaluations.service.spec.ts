import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { EvaluationsService } from './evaluations.service';

const adminUser = {
  id: 'u_admin', tenantId: 't_demo', role: 'SCHOOL_ADMIN', email: 'admin@demo.tn',
} as AuthenticatedUser;
const teacherUser = {
  id: 'u_teacher', tenantId: 't_demo', role: 'TEACHER', email: 'teacher@demo.tn',
} as AuthenticatedUser;

function buildPrismaMock() {
  return {
    class: { findFirst: vi.fn() },
    subject: { findFirst: vi.fn() },
    gradePeriod: { findFirst: vi.fn() },
    classTeacher: { findFirst: vi.fn() },
    evaluation: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    grade: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    student: { findFirst: vi.fn() },
    parentStudent: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('EvaluationsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: EvaluationsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    const fanout = { fanoutGrade: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new EvaluationsService(prisma as any, fanout as any, {
      runDetached: (fn: () => unknown) => {
        void Promise.resolve().then(fn).catch(() => undefined);
      },
    } as any);
  });

  const baseCreateDto = {
    classId: 'c1',
    subjectId: 's1',
    gradePeriodId: 'p1',
    title: 'Contrôle chap 3',
    date: '2025-10-15',
    maxScore: 20,
  };

  it('rejects when maxScore <= 0', async () => {
    await expect(service.createEvaluation({ ...baseCreateDto, maxScore: 0 }, adminUser))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects TEACHER who is not assigned to the class', async () => {
    prisma.class.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.subject.findFirst.mockResolvedValue({ id: 's1' });
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', isClosed: false });
    prisma.classTeacher.findFirst.mockResolvedValue(null);
    await expect(service.createEvaluation(baseCreateDto, teacherUser))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows SCHOOL_ADMIN to create eval without classTeacher row', async () => {
    prisma.class.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.subject.findFirst.mockResolvedValue({ id: 's1' });
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', isClosed: false });
    prisma.evaluation.create.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      title: 'Contrôle', date: new Date('2025-10-15'), maxScore: 20, createdById: 'u_admin',
      createdAt: new Date(), updatedAt: new Date(),
    });
    const res = await service.createEvaluation(baseCreateDto, adminUser);
    expect(res.id).toBe('e1');
    expect(prisma.classTeacher.findFirst).not.toHaveBeenCalled();
  });

  it('refuses grade entry on a closed period', async () => {
    prisma.evaluation.findFirst.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      maxScore: 20, gradePeriod: { isClosed: true },
    });
    await expect(service.upsertGrade('e1', { studentId: 'st1', score: 12 }, adminUser))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses grade with score > maxScore', async () => {
    prisma.evaluation.findFirst.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      maxScore: 20, gradePeriod: { isClosed: false },
    });
    prisma.student.findFirst.mockResolvedValue({ id: 'st1', tenantId: 't_demo' });
    await expect(service.upsertGrade('e1', { studentId: 'st1', score: 25 }, adminUser))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses grade with score < 0', async () => {
    prisma.evaluation.findFirst.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      maxScore: 20, gradePeriod: { isClosed: false },
    });
    prisma.student.findFirst.mockResolvedValue({ id: 'st1', tenantId: 't_demo' });
    await expect(service.upsertGrade('e1', { studentId: 'st1', score: -1 }, adminUser))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('upserts grade successfully when score valid and period open', async () => {
    prisma.evaluation.findFirst.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      maxScore: 20, gradePeriod: { isClosed: false },
    });
    prisma.student.findFirst.mockResolvedValue({ id: 'st1', tenantId: 't_demo' });
    prisma.grade.upsert.mockResolvedValue({
      id: 'g1', tenantId: 't_demo', evaluationId: 'e1', studentId: 'st1', score: 15,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const res = await service.upsertGrade('e1', { studentId: 'st1', score: 15 }, adminUser);
    expect(res.score).toBe(15);
  });
});
