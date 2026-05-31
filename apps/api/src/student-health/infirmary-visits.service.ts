import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InfirmaryOutcome, Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import type {
  CreateInfirmaryVisitDto,
  InfirmaryVisitResponseDto,
  ListInfirmaryVisitsQueryDto,
  ListInfirmaryVisitsResponseDto,
  UpdateInfirmaryVisitDto,
} from './dto/infirmary-visit.dto';

type Row = Prisma.InfirmaryVisitGetPayload<{ include: { student: true } }>;

/** Outcomes that trigger a parent notification. */
const NOTIFY_OUTCOMES: ReadonlySet<InfirmaryOutcome> = new Set([
  InfirmaryOutcome.SENT_HOME,
  InfirmaryOutcome.EMERGENCY,
]);

@Injectable()
export class InfirmaryVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
  ) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(
    query: ListInfirmaryVisitsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListInfirmaryVisitsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.InfirmaryVisitWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.studentId) where.studentId = query.studentId;
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId =
        query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.infirmaryVisit.findMany({
        where,
        include: { student: true },
        orderBy: [{ visitedAt: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.infirmaryVisit.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<InfirmaryVisitResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.infirmaryVisit.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true },
    });
    if (!row) throw new NotFoundException({ code: 'INFIRMARY_VISIT_NOT_FOUND' });
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      if (!ids.includes(row.studentId)) {
        throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' });
      }
    }
    return this.toResponse(row);
  }

  async create(
    dto: CreateInfirmaryVisitDto,
    user: AuthenticatedUser,
  ): Promise<InfirmaryVisitResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    const outcome = dto.outcome ?? InfirmaryOutcome.RETURNED_TO_CLASS;
    const row = await this.prisma.infirmaryVisit.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        studentId: dto.studentId,
        visitedAt: new Date(dto.visitedAt),
        reason: dto.reason,
        treatment: dto.treatment ?? null,
        temperature: dto.temperature ?? null,
        outcome,
        recordedById: user.id,
      },
      include: { student: true },
    });
    if (NOTIFY_OUTCOMES.has(outcome)) {
      void this.fanoutVisit(
        user.tenantId,
        dto.studentId,
        `${student.firstName} ${student.lastName}`.trim(),
        outcome as 'SENT_HOME' | 'EMERGENCY',
      );
    }
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: UpdateInfirmaryVisitDto,
    user: AuthenticatedUser,
  ): Promise<InfirmaryVisitResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.infirmaryVisit.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true },
    });
    if (!existing) throw new NotFoundException({ code: 'INFIRMARY_VISIT_NOT_FOUND' });
    const row = await this.prisma.infirmaryVisit.update({
      where: { id },
      data: {
        ...(dto.visitedAt !== undefined ? { visitedAt: new Date(dto.visitedAt) } : {}),
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
        ...(dto.treatment !== undefined ? { treatment: dto.treatment } : {}),
        ...(dto.temperature !== undefined ? { temperature: dto.temperature } : {}),
        ...(dto.outcome !== undefined ? { outcome: dto.outcome } : {}),
      },
      include: { student: true },
    });
    // Notify only on a NEW transition into a notify-worthy outcome.
    if (
      dto.outcome !== undefined &&
      NOTIFY_OUTCOMES.has(dto.outcome) &&
      !NOTIFY_OUTCOMES.has(existing.outcome)
    ) {
      void this.fanoutVisit(
        user.tenantId,
        existing.studentId,
        `${existing.student.firstName} ${existing.student.lastName}`.trim(),
        dto.outcome as 'SENT_HOME' | 'EMERGENCY',
      );
    }
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.infirmaryVisit.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'INFIRMARY_VISIT_NOT_FOUND' });
    await this.prisma.infirmaryVisit.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async fanoutVisit(
    tenantId: string,
    studentId: string,
    studentName: string,
    outcome: 'SENT_HOME' | 'EMERGENCY',
  ): Promise<void> {
    const parents = await this.prisma.parentStudent.findMany({
      where: { tenantId, studentId },
      select: { parentUserId: true },
    });
    await Promise.allSettled(
      parents.map((p) =>
        this.fanout.fanoutInfirmaryVisit(tenantId, p.parentUserId, studentName, outcome),
      ),
    );
  }

  private toResponse(r: Row): InfirmaryVisitResponseDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      visitedAt: r.visitedAt.toISOString(),
      reason: r.reason,
      treatment: r.treatment,
      temperature: r.temperature,
      outcome: r.outcome,
      recordedById: r.recordedById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
