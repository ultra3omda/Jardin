import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import type {
  CreateDisciplineIncidentDto,
  DisciplineIncidentResponseDto,
  ListDisciplineQueryDto,
  ListDisciplineResponseDto,
  ResolveDisciplineIncidentDto,
  UpdateDisciplineIncidentDto,
} from './dto/discipline.dto';

type Row = Prisma.DisciplineIncidentGetPayload<{ include: { student: true } }>;

@Injectable()
export class DisciplineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(
    query: ListDisciplineQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListDisciplineResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.DisciplineIncidentWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
    };
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId =
        query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.disciplineIncident.findMany({
        where,
        include: { student: true },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.disciplineIncident.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async create(
    dto: CreateDisciplineIncidentDto,
    user: AuthenticatedUser,
  ): Promise<DisciplineIncidentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    if (dto.classId) {
      const klass = await this.prisma.class.findFirst({
        where: { id: dto.classId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!klass) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });
    }
    const row = await this.prisma.disciplineIncident.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        studentId: dto.studentId,
        classId: dto.classId ?? null,
        type: dto.type,
        occurredAt: new Date(dto.occurredAt),
        description: dto.description,
        sanction: dto.sanction ?? null,
        reportedById: user.id,
      },
      include: { student: true },
    });
    // T2b — notify the student's parents. Fire-and-forget; never blocks creation.
    const notifyTenantId = user.tenantId;
    this.tenantContext.runDetached(() =>
      this.fanoutIncident(
        notifyTenantId,
        dto.studentId,
        `${student.firstName} ${student.lastName}`.trim(),
        dto.type,
      ),
    );
    return this.toResponse(row);
  }

  async getById(id: string, user: AuthenticatedUser): Promise<DisciplineIncidentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.disciplineIncident.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true },
    });
    if (!row) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND' });
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      if (!ids.includes(row.studentId)) {
        throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' });
      }
    }
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: UpdateDisciplineIncidentDto,
    user: AuthenticatedUser,
  ): Promise<DisciplineIncidentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.disciplineIncident.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND' });
    const row = await this.prisma.disciplineIncident.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.occurredAt !== undefined ? { occurredAt: new Date(dto.occurredAt) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.sanction !== undefined ? { sanction: dto.sanction } : {}),
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async resolve(
    id: string,
    dto: ResolveDisciplineIncidentDto,
    user: AuthenticatedUser,
  ): Promise<DisciplineIncidentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.disciplineIncident.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND' });
    const row = await this.prisma.disciplineIncident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById: user.id,
        ...(dto.resolutionNote !== undefined ? { resolutionNote: dto.resolutionNote } : {}),
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.disciplineIncident.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND' });
    await this.prisma.disciplineIncident.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async fanoutIncident(
    tenantId: string,
    studentId: string,
    studentName: string,
    severity: 'MINOR' | 'MAJOR' | 'SUSPENSION',
  ): Promise<void> {
    const parents = await this.prisma.parentStudent.findMany({
      where: { tenantId, studentId },
      select: { parentUserId: true },
    });
    await Promise.allSettled(
      parents.map((p) =>
        this.fanout.fanoutDisciplineIncident(tenantId, p.parentUserId, studentName, severity),
      ),
    );
  }

  private toResponse(r: Row): DisciplineIncidentResponseDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      classId: r.classId,
      type: r.type,
      occurredAt: r.occurredAt.toISOString().slice(0, 10),
      description: r.description,
      sanction: r.sanction,
      status: r.status,
      resolutionNote: r.resolutionNote,
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      reportedById: r.reportedById,
      resolvedById: r.resolvedById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
