import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateDailyLogDto,
  DailyLogResponseDto,
  ListJournalQueryDto,
  ListJournalResponseDto,
  UpdateDailyLogDto,
} from './dto/journal.dto';

type Row = Prisma.DailyLogEntryGetPayload<{ include: { student: true } }>;

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(query: ListJournalQueryDto, user: AuthenticatedUser): Promise<ListJournalResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.DailyLogEntryWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.studentId) where.studentId = query.studentId;
    if (query.date) where.date = new Date(query.date);
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId =
        query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.dailyLogEntry.findMany({
        where,
        include: { student: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.dailyLogEntry.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async create(dto: CreateDailyLogDto, user: AuthenticatedUser): Promise<DailyLogResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    try {
      const row = await this.prisma.dailyLogEntry.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          studentId: dto.studentId,
          date: new Date(dto.date),
          meals: dto.meals ?? null,
          nap: dto.nap ?? null,
          mood: dto.mood ?? null,
          bathroom: dto.bathroom ?? null,
          activitiesNote: dto.activitiesNote ?? null,
          generalNote: dto.generalNote ?? null,
          authorId: user.id,
        },
        include: { student: true },
      });
      return this.toResponse(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'DAILY_LOG_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async getById(id: string, user: AuthenticatedUser): Promise<DailyLogResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.dailyLogEntry.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true },
    });
    if (!row) throw new NotFoundException({ code: 'DAILY_LOG_NOT_FOUND' });
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
    dto: UpdateDailyLogDto,
    user: AuthenticatedUser,
  ): Promise<DailyLogResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.dailyLogEntry.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'DAILY_LOG_NOT_FOUND' });
    const row = await this.prisma.dailyLogEntry.update({
      where: { id },
      data: {
        ...(dto.meals !== undefined ? { meals: dto.meals } : {}),
        ...(dto.nap !== undefined ? { nap: dto.nap } : {}),
        ...(dto.mood !== undefined ? { mood: dto.mood } : {}),
        ...(dto.bathroom !== undefined ? { bathroom: dto.bathroom } : {}),
        ...(dto.activitiesNote !== undefined ? { activitiesNote: dto.activitiesNote } : {}),
        ...(dto.generalNote !== undefined ? { generalNote: dto.generalNote } : {}),
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.dailyLogEntry.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'DAILY_LOG_NOT_FOUND' });
    await this.prisma.dailyLogEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toResponse(r: Row): DailyLogResponseDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      date: r.date.toISOString().slice(0, 10),
      meals: r.meals,
      nap: r.nap,
      mood: r.mood,
      bathroom: r.bathroom,
      activitiesNote: r.activitiesNote,
      generalNote: r.generalNote,
      authorId: r.authorId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
