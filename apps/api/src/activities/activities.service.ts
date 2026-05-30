import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  ActivityResponseDto,
  AddParticipationDto,
  CreateActivityDto,
  ListActivitiesResponseDto,
  ParticipationResponseDto,
  UpdateActivityDto,
} from './dto/activity.dto';

type ActivityRow = Prisma.ActivityGetPayload<{ include: { _count: { select: { participations: true } } } }>;

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser): Promise<ListActivitiesResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.ActivityWhereInput = { tenantId: user.tenantId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: { _count: { select: { participations: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async create(dto: CreateActivityDto, user: AuthenticatedUser): Promise<ActivityResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.activity.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        name: dto.name.trim(),
        description: dto.description ?? null,
        category: dto.category ?? 'OTHER',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        durationMin: dto.durationMin ?? null,
        location: dto.location ?? null,
      },
      include: { _count: { select: { participations: true } } },
    });
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateActivityDto, user: AuthenticatedUser): Promise<ActivityResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.activity.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'ACTIVITY_NOT_FOUND' });
    const row = await this.prisma.activity.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null } : {}),
        ...(dto.durationMin !== undefined ? { durationMin: dto.durationMin } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
      },
      include: { _count: { select: { participations: true } } },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.activity.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'ACTIVITY_NOT_FOUND' });
    await this.prisma.activity.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async listParticipations(activityId: string, user: AuthenticatedUser): Promise<ParticipationResponseDto[]> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!activity) throw new NotFoundException({ code: 'ACTIVITY_NOT_FOUND' });
    const where: Prisma.ActivityParticipationWhereInput = { tenantId: user.tenantId, activityId };
    if (user.role === 'PARENT') {
      const owned = await this.prisma.parentStudent.findMany({
        where: { tenantId: user.tenantId, parentUserId: user.id },
        select: { studentId: true },
      });
      where.studentId = { in: owned.map((o) => o.studentId) };
    }
    const rows = await this.prisma.activityParticipation.findMany({ where, include: { student: true } });
    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
    }));
  }

  async addParticipation(
    activityId: string,
    dto: AddParticipationDto,
    user: AuthenticatedUser,
  ): Promise<ParticipationResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!activity) throw new NotFoundException({ code: 'ACTIVITY_NOT_FOUND' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    try {
      const row = await this.prisma.activityParticipation.create({
        data: { id: createId(), tenantId: user.tenantId, activityId, studentId: dto.studentId },
      });
      return {
        id: row.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ForbiddenException({ code: 'PARTICIPATION_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async removeParticipation(activityId: string, studentId: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const res = await this.prisma.activityParticipation.deleteMany({
      where: { tenantId: user.tenantId, activityId, studentId },
    });
    if (res.count === 0) throw new NotFoundException({ code: 'PARTICIPATION_NOT_FOUND' });
  }

  private toResponse(r: ActivityRow): ActivityResponseDto {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
      durationMin: r.durationMin,
      location: r.location,
      participantCount: r._count.participations,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
