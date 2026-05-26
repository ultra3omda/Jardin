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
import type {
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
  constructor(private readonly prisma: PrismaService) {}

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

  // ───── Helpers ─────

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
