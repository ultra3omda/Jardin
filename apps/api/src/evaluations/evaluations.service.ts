import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import type {
  AdminClassPerfDto,
  ChildGradesDto,
  ClassEvalStatsDto,
  CreateEvaluationDto,
  EvaluationResponseDto,
  EvaluationWithGradesResponseDto,
  GradeResponseDto,
  ListEvaluationsResponseDto,
  UpdateEvaluationDto,
  UpsertGradeDto,
} from './dto/evaluation.dto';

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ───── Evaluations ─────

  async createEvaluation(
    dto: CreateEvaluationDto,
    user: AuthenticatedUser,
  ): Promise<EvaluationResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    if (dto.maxScore <= 0) throw new BadRequestException({ code: 'INVALID_MAX_SCORE' });

    const [klass, subject, period] = await Promise.all([
      this.prisma.class.findFirst({
        where: { id: dto.classId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.subject.findFirst({
        where: { id: dto.subjectId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.gradePeriod.findFirst({
        where: { id: dto.gradePeriodId, tenantId: user.tenantId },
        select: { id: true, isClosed: true },
      }),
    ]);
    if (!klass) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });
    if (!subject) throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND' });
    if (!period) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND' });
    if (period.isClosed) throw new BadRequestException({ code: 'PERIOD_CLOSED' });

    if (user.role === UserRole.TEACHER) {
      const assignment = await this.prisma.classTeacher.findFirst({
        where: { classId: dto.classId, teacherUserId: user.id, tenantId: user.tenantId },
        select: { id: true },
      });
      if (!assignment) throw new ForbiddenException({ code: 'NOT_ASSIGNED_TO_CLASS' });
    }

    const created = await this.prisma.evaluation.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        gradePeriodId: dto.gradePeriodId,
        title: dto.title,
        date: new Date(dto.date),
        maxScore: dto.maxScore,
        createdById: user.id,
      },
    });
    return this.toEvaluationResponse(created);
  }

  async listEvaluations(
    user: AuthenticatedUser,
    filters: { classId?: string; gradePeriodId?: string; subjectId?: string },
  ): Promise<ListEvaluationsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.EvaluationWhereInput = {
      tenantId: user.tenantId,
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.gradePeriodId ? { gradePeriodId: filters.gradePeriodId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.evaluation.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.evaluation.count({ where }),
    ]);
    return { items: items.map((e) => this.toEvaluationResponse(e)), total };
  }

  async getEvaluationWithGrades(
    id: string,
    user: AuthenticatedUser,
  ): Promise<EvaluationWithGradesResponseDto> {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
      include: { grades: true },
    });
    if (!evaluation) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    return {
      evaluation: this.toEvaluationResponse(evaluation),
      grades: evaluation.grades.map((g) => this.toGradeResponse(g)),
    };
  }

  async updateEvaluation(
    id: string,
    dto: UpdateEvaluationDto,
    user: AuthenticatedUser,
  ): Promise<EvaluationResponseDto> {
    const existing = await this.prisma.evaluation.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    await this.ensureTeacherAssignment(user, existing.classId);

    const updated = await this.prisma.evaluation.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.maxScore !== undefined ? { maxScore: dto.maxScore } : {}),
      },
    });
    return this.toEvaluationResponse(updated);
  }

  async deleteEvaluation(id: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.prisma.evaluation.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    await this.ensureTeacherAssignment(user, existing.classId);
    await this.prisma.evaluation.delete({ where: { id } });
  }

  // ───── Grades ─────

  async upsertGrade(
    evaluationId: string,
    dto: UpsertGradeDto,
    user: AuthenticatedUser,
  ): Promise<GradeResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });

    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, tenantId: user.tenantId },
      include: { gradePeriod: { select: { isClosed: true } } },
    });
    if (!evaluation) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    if (evaluation.gradePeriod.isClosed) throw new BadRequestException({ code: 'PERIOD_CLOSED' });

    await this.ensureTeacherAssignment(user, evaluation.classId);

    if (dto.score < 0 || dto.score > evaluation.maxScore) {
      throw new BadRequestException({ code: 'SCORE_OUT_OF_RANGE' });
    }

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });

    const upserted = await this.prisma.grade.upsert({
      where: { unique_grade_per_eval_student: { evaluationId, studentId: dto.studentId } },
      create: {
        id: createId(),
        tenantId: user.tenantId,
        evaluationId,
        studentId: dto.studentId,
        score: dto.score,
      },
      update: { score: dto.score },
    });
    // V10 — notify the student's parents of the new/updated grade. Fire-and-forget.
    const notifyTenantId = user.tenantId;
    this.tenantContext.runDetached(() =>
      this.fanoutGradeNotification(notifyTenantId, evaluation, dto.studentId),
    );
    return this.toGradeResponse(upserted);
  }

  async deleteGrade(
    evaluationId: string,
    studentId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, tenantId: user.tenantId ?? undefined },
      include: { gradePeriod: { select: { isClosed: true } } },
    });
    if (!evaluation) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    if (evaluation.gradePeriod.isClosed) throw new BadRequestException({ code: 'PERIOD_CLOSED' });
    await this.ensureTeacherAssignment(user, evaluation.classId);

    const existing = await this.prisma.grade.findFirst({
      where: { evaluationId, studentId },
    });
    if (!existing) throw new NotFoundException({ code: 'GRADE_NOT_FOUND' });
    await this.prisma.grade.delete({ where: { id: existing.id } });
  }

  // ───── Mobile aggregation endpoints ─────

  /**
   * For PARENT role — returns grades for all children linked to this parent.
   * Groups by child → subject → latest grade (normalized to /20).
   */
  async getMyGrades(tenantId: string, userId: string): Promise<ChildGradesDto[]> {
    // 1. Fetch the parent's children
    const parentLinks = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId: userId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, classroom: true },
        },
      },
    });
    if (parentLinks.length === 0) return [];

    // 2. Find the current (open) grade period for this tenant
    const currentPeriod = await this.prisma.gradePeriod.findFirst({
      where: { tenantId, isClosed: false },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });
    // Fall back to the most recent period if all are closed
    const fallbackPeriod = currentPeriod
      ? currentPeriod
      : await this.prisma.gradePeriod.findFirst({
          where: { tenantId },
          orderBy: { startDate: 'desc' },
          select: { id: true },
        });
    if (!fallbackPeriod) return [];

    const periodId = fallbackPeriod.id;

    // 3. For each child, aggregate grades per subject
    const results: ChildGradesDto[] = [];

    for (const link of parentLinks) {
      const { student } = link;

      // Find the class entity that matches the student's classroom string
      const classEntity = await this.prisma.class.findFirst({
        where: { tenantId, name: student.classroom, deletedAt: null },
        select: { id: true },
      });

      // Fetch all evaluations for this period (scoped to class if found)
      const evaluations = await this.prisma.evaluation.findMany({
        where: {
          tenantId,
          gradePeriodId: periodId,
          ...(classEntity ? { classId: classEntity.id } : {}),
        },
        include: {
          subject: { select: { name: true } },
          grades: {
            where: { studentId: student.id },
            select: { score: true },
          },
        },
      });

      // Group by subject and compute per-subject average normalized to /20
      const subjectMap = new Map<
        string,
        { name: string; scores: number[]; maxScores: number[] }
      >();

      for (const evaluation of evaluations) {
        const subjectName = evaluation.subject.name;
        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, { name: subjectName, scores: [], maxScores: [] });
        }
        const entry = subjectMap.get(subjectName)!;
        for (const grade of evaluation.grades) {
          entry.scores.push(grade.score);
          entry.maxScores.push(evaluation.maxScore);
        }
      }

      const subjects = Array.from(subjectMap.values()).map((s) => {
        let grade: number | null = null;
        if (s.scores.length > 0) {
          const totalRaw = s.scores.reduce((a, b) => a + b, 0);
          const totalMax = s.maxScores.reduce((a, b) => a + b, 0);
          grade = Math.round((totalRaw / totalMax) * 20 * 100) / 100;
        }
        return {
          subjectName: s.name,
          grade,
          outOf: 20,
          coefficient: 1,
        };
      });

      // Compute overall average
      const graded = subjects.filter((s) => s.grade !== null);
      const average =
        graded.length > 0
          ? Math.round(
              (graded.reduce((a, s) => a + s.grade!, 0) / graded.length) * 100,
            ) / 100
          : null;

      results.push({
        childName: `${student.firstName} ${student.lastName}`,
        className: student.classroom,
        subjects,
        average,
      });
    }

    return results;
  }

  /**
   * For TEACHER role — returns evaluation progress stats per assigned class/subject.
   */
  async getMyClassesStats(tenantId: string, userId: string): Promise<ClassEvalStatsDto[]> {
    // 1. Get all class assignments for this teacher
    const assignments = await this.prisma.classTeacher.findMany({
      where: { tenantId, teacherUserId: userId },
      include: {
        class: { select: { id: true, name: true } },
      },
    });
    if (assignments.length === 0) return [];

    // 2. Find current or latest grade period
    const currentPeriod =
      (await this.prisma.gradePeriod.findFirst({
        where: { tenantId, isClosed: false },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      })) ??
      (await this.prisma.gradePeriod.findFirst({
        where: { tenantId },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      }));
    if (!currentPeriod) return [];

    const results: ClassEvalStatsDto[] = [];

    for (const assignment of assignments) {
      const classId = assignment.class.id;
      const subjectName = assignment.subject;

      // Find the Subject entity for this assignment's subject string
      const subjectEntity = await this.prisma.subject.findFirst({
        where: { tenantId, name: subjectName, deletedAt: null },
        select: { id: true },
      });

      // Count students in this class (students whose classroom = class name)
      const studentCount = await this.prisma.student.count({
        where: { tenantId, classroom: assignment.class.name, deletedAt: null },
      });

      // Fetch evaluations for this class/subject/period
      const evaluations = await this.prisma.evaluation.findMany({
        where: {
          tenantId,
          classId,
          gradePeriodId: currentPeriod.id,
          ...(subjectEntity ? { subjectId: subjectEntity.id } : {}),
        },
        include: {
          grades: { select: { score: true } },
        },
      });

      // Collect scores for average computation
      const allScores: number[] = [];
      const allMaxScores: number[] = [];

      for (const evaluation of evaluations) {
        for (const grade of evaluation.grades) {
          allScores.push(grade.score);
          allMaxScores.push(evaluation.maxScore);
        }
      }

      // Count distinct students who received at least one grade
      const gradeRecords = await this.prisma.grade.findMany({
        where: {
          tenantId,
          evaluationId: { in: evaluations.map((e) => e.id) },
        },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      const doneStudents = gradeRecords.length;

      const average =
        allScores.length > 0
          ? Math.round(
              (allScores.reduce((a, b) => a + b, 0) /
                allMaxScores.reduce((a, b) => a + b, 0)) *
                20 *
                100,
            ) / 100
          : null;

      results.push({
        className: assignment.class.name,
        subjectName,
        average,
        studentCount,
        doneCount: doneStudents,
      });
    }

    return results;
  }

  /**
   * For SCHOOL_ADMIN role — returns performance summary per class for the current period.
   */
  async getAdminPerf(tenantId: string): Promise<AdminClassPerfDto[]> {
    // 1. Get all active classes
    const classes = await this.prisma.class.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    if (classes.length === 0) return [];

    // 2. Find current or latest grade period
    const currentPeriod =
      (await this.prisma.gradePeriod.findFirst({
        where: { tenantId, isClosed: false },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      })) ??
      (await this.prisma.gradePeriod.findFirst({
        where: { tenantId },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      }));
    if (!currentPeriod) return [];

    const results: AdminClassPerfDto[] = [];

    for (const klass of classes) {
      // Count students in this class
      const studentCount = await this.prisma.student.count({
        where: { tenantId, classroom: klass.name, deletedAt: null },
      });

      // Fetch all evaluations for this class and period with grades
      const evaluations = await this.prisma.evaluation.findMany({
        where: { tenantId, classId: klass.id, gradePeriodId: currentPeriod.id },
        include: {
          subject: { select: { id: true, name: true } },
          grades: { select: { score: true } },
        },
      });

      if (evaluations.length === 0) {
        results.push({
          className: klass.name,
          overall: null,
          topSubject: '',
          studentCount,
        });
        continue;
      }

      // Aggregate per subject
      const subjectStats = new Map<
        string,
        { name: string; scores: number[]; maxScores: number[] }
      >();

      for (const evaluation of evaluations) {
        const key = evaluation.subject.id;
        if (!subjectStats.has(key)) {
          subjectStats.set(key, {
            name: evaluation.subject.name,
            scores: [],
            maxScores: [],
          });
        }
        const entry = subjectStats.get(key)!;
        for (const grade of evaluation.grades) {
          entry.scores.push(grade.score);
          entry.maxScores.push(evaluation.maxScore);
        }
      }

      // Compute per-subject averages normalized to /20
      let overallSum = 0;
      let overallCount = 0;
      let topSubject = '';
      let topAvg = -1;

      for (const [, stats] of subjectStats) {
        if (stats.scores.length === 0) continue;
        const avg =
          (stats.scores.reduce((a, b) => a + b, 0) /
            stats.maxScores.reduce((a, b) => a + b, 0)) *
          20;
        overallSum += avg;
        overallCount += 1;
        if (avg > topAvg) {
          topAvg = avg;
          topSubject = `${stats.name} ${Math.round(avg * 10) / 10}`;
        }
      }

      const overall =
        overallCount > 0
          ? Math.round((overallSum / overallCount) * 100) / 100
          : null;

      results.push({
        className: klass.name,
        overall,
        topSubject,
        studentCount,
      });
    }

    return results;
  }

  // ───── Helpers ─────

  /**
   * V10 — Fan-out a "new grade" notification to every parent linked to the
   * student. Fire-and-forget; never blocks grade entry.
   */
  private async fanoutGradeNotification(
    tenantId: string,
    evaluation: { subjectId: string; gradePeriodId: string },
    studentId: string,
  ): Promise<void> {
    const parents = await this.prisma.parentStudent.findMany({
      where: { tenantId, studentId },
      select: { parentUserId: true },
    });
    if (parents.length === 0) return;
    const [student, subject, period] = await Promise.all([
      this.prisma.student.findFirst({
        where: { id: studentId, tenantId },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.subject.findFirst({
        where: { id: evaluation.subjectId, tenantId },
        select: { name: true },
      }),
      this.prisma.gradePeriod.findFirst({
        where: { id: evaluation.gradePeriodId, tenantId },
        select: { name: true },
      }),
    ]);
    if (!student || !subject) return;
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    await Promise.allSettled(
      parents.map((p) =>
        this.fanout.fanoutGrade(tenantId, p.parentUserId, studentName, subject.name, period?.name),
      ),
    );
  }

  private async ensureTeacherAssignment(user: AuthenticatedUser, classId: string): Promise<void> {
    if (user.role !== UserRole.TEACHER) return;
    const assignment = await this.prisma.classTeacher.findFirst({
      where: { classId, teacherUserId: user.id, tenantId: user.tenantId ?? undefined },
      select: { id: true },
    });
    if (!assignment) throw new ForbiddenException({ code: 'NOT_ASSIGNED_TO_CLASS' });
  }

  private toEvaluationResponse(e: {
    id: string;
    classId: string;
    subjectId: string;
    gradePeriodId: string;
    title: string;
    date: Date;
    maxScore: number;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }): EvaluationResponseDto {
    return {
      id: e.id,
      classId: e.classId,
      subjectId: e.subjectId,
      gradePeriodId: e.gradePeriodId,
      title: e.title,
      date: e.date,
      maxScore: e.maxScore,
      createdById: e.createdById,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  private toGradeResponse(g: {
    id: string;
    evaluationId: string;
    studentId: string;
    score: number;
    createdAt: Date;
    updatedAt: Date;
  }): GradeResponseDto {
    return {
      id: g.id,
      evaluationId: g.evaluationId,
      studentId: g.studentId,
      score: g.score,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }
}
