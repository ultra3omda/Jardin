import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  AssignTeacherDto,
  ClassResponseDto,
  ClassTeacherResponseDto,
  CreateClassDto,
  CreateTimeSlotDto,
  ListClassesResponseDto,
  MyScheduleResponseDto,
  MyScheduleSlotDto,
  TimeSlotResponseDto,
  UpdateClassDto,
  UpdateTimeSlotDto,
} from './dto/class.dto';

/**
 * V4 — Classes / EDT service.
 *
 * Authorization:
 *  - SCHOOL_ADMIN : full CRUD
 *  - TEACHER / STAFF : read only
 *  - SUPER_ADMIN : cross-tenant (requires explicit tenant scoping — TBD V11)
 */
@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ───── Classes ─────

  async create(dto: CreateClassDto, user: AuthenticatedUser): Promise<ClassResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    try {
      const created = await this.prisma.class.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          name: dto.name,
          level: dto.level,
          schoolYear: dto.schoolYear,
        },
      });
      return this.toClassResponse(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'CLASS_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async list(user: AuthenticatedUser, schoolYear?: string): Promise<ListClassesResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.ClassWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...(schoolYear ? { schoolYear } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.class.findMany({
        where,
        orderBy: [{ schoolYear: 'desc' }, { level: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.class.count({ where }),
    ]);
    return { items: items.map((c) => this.toClassResponse(c)), total };
  }

  /**
   * A teacher's own timetable: every TimeSlot whose `teacherUserId` is the
   * caller, across all classes, with the class name attached. Tenant-scoped.
   * Used by the schedule page for TEACHER / STAFF so each only sees their own.
   */
  async mySchedule(
    user: AuthenticatedUser,
    schoolYear?: string,
  ): Promise<MyScheduleResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const rows = await this.prisma.timeSlot.findMany({
      where: {
        tenantId: user.tenantId,
        teacherUserId: user.id,
        ...(schoolYear ? { class: { schoolYear } } : {}),
        class: { deletedAt: null, ...(schoolYear ? { schoolYear } : {}) },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodStart: 'asc' }],
      include: { class: { select: { name: true } } },
    });
    const items: MyScheduleSlotDto[] = rows.map((s) => ({
      id: s.id,
      classId: s.classId,
      className: s.class.name,
      dayOfWeek: s.dayOfWeek,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      subject: s.subject,
      room: s.room,
    }));
    return { items, total: items.length };
  }

  async findById(id: string, user: AuthenticatedUser): Promise<ClassResponseDto> {
    const c = await this.prisma.class.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined, deletedAt: null },
      include: {
        teachers: {
          include: {
            teacher: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        timeSlots: {
          include: {
            teacher: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { periodStart: 'asc' }],
        },
      },
    });
    if (!c) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });
    return this.toClassResponse(c, c.teachers, c.timeSlots);
  }

  async update(id: string, dto: UpdateClassDto, user: AuthenticatedUser): Promise<ClassResponseDto> {
    const existing = await this.prisma.class.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });
    const updated = await this.prisma.class.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.level !== undefined ? { level: dto.level } : {}),
      },
    });
    return this.toClassResponse(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.prisma.class.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });
    await this.prisma.class.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ───── Teacher assignments ─────

  async assignTeacher(
    classId: string,
    dto: AssignTeacherDto,
    user: AuthenticatedUser,
  ): Promise<ClassTeacherResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const klass = await this.prisma.class.findFirst({
      where: { id: classId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!klass) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });

    const teacher = await this.prisma.user.findFirst({
      where: { id: dto.teacherUserId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!teacher) throw new NotFoundException({ code: 'TEACHER_NOT_FOUND' });
    if (teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException({ code: 'USER_NOT_TEACHER_ROLE' });
    }

    try {
      const created = await this.prisma.classTeacher.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          classId,
          teacherUserId: dto.teacherUserId,
          subject: dto.subject,
          isMainTeacher: dto.isMainTeacher ?? false,
        },
      });
      return this.toClassTeacherResponse(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'TEACHER_ALREADY_ASSIGNED' });
      }
      throw e;
    }
  }

  async unassignTeacher(assignmentId: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.prisma.classTeacher.findFirst({
      where: { id: assignmentId, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND' });
    await this.prisma.classTeacher.delete({ where: { id: assignmentId } });
  }

  // ───── TimeSlots ─────

  async createTimeSlot(
    classId: string,
    dto: CreateTimeSlotDto,
    user: AuthenticatedUser,
  ): Promise<TimeSlotResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const klass = await this.prisma.class.findFirst({
      where: { id: classId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!klass) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });

    if (dto.periodEnd <= dto.periodStart) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE' });
    }

    if (dto.teacherUserId) {
      const teacher = await this.prisma.user.findFirst({
        where: { id: dto.teacherUserId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true, role: true },
      });
      if (!teacher) throw new NotFoundException({ code: 'TEACHER_NOT_FOUND' });
      if (teacher.role !== UserRole.TEACHER) {
        throw new BadRequestException({ code: 'USER_NOT_TEACHER_ROLE' });
      }
    }

    const created = await this.prisma.timeSlot.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        classId,
        dayOfWeek: dto.dayOfWeek,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        subject: dto.subject,
        teacherUserId: dto.teacherUserId ?? null,
        room: dto.room ?? null,
      },
    });
    return this.toTimeSlotResponse(created);
  }

  async updateTimeSlot(
    slotId: string,
    dto: UpdateTimeSlotDto,
    user: AuthenticatedUser,
  ): Promise<TimeSlotResponseDto> {
    const existing = await this.prisma.timeSlot.findFirst({
      where: { id: slotId, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'SLOT_NOT_FOUND' });
    const start = dto.periodStart ?? existing.periodStart;
    const end = dto.periodEnd ?? existing.periodEnd;
    if (end <= start) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE' });
    }
    const updated = await this.prisma.timeSlot.update({
      where: { id: slotId },
      data: {
        ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
        ...(dto.periodStart !== undefined ? { periodStart: dto.periodStart } : {}),
        ...(dto.periodEnd !== undefined ? { periodEnd: dto.periodEnd } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.teacherUserId !== undefined ? { teacherUserId: dto.teacherUserId } : {}),
        ...(dto.room !== undefined ? { room: dto.room } : {}),
      },
    });
    return this.toTimeSlotResponse(updated);
  }

  async deleteTimeSlot(slotId: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.prisma.timeSlot.findFirst({
      where: { id: slotId, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'SLOT_NOT_FOUND' });
    await this.prisma.timeSlot.delete({ where: { id: slotId } });
  }

  // ───── Helpers ─────

  private toClassResponse(
    c: { id: string; name: string; level: string; schoolYear: string; createdAt: Date; updatedAt: Date },
    teachers?: Array<{
      id: string;
      classId: string;
      teacherUserId: string;
      subject: string;
      isMainTeacher: boolean;
      createdAt: Date;
      teacher?: { id: string; email: string; firstName: string; lastName: string } | null;
    }>,
    timeSlots?: Array<{
      id: string;
      classId: string;
      dayOfWeek: number;
      periodStart: string;
      periodEnd: string;
      subject: string;
      teacherUserId: string | null;
      room: string | null;
      createdAt: Date;
      updatedAt: Date;
      teacher?: { id: string; email: string; firstName: string; lastName: string } | null;
    }>,
  ): ClassResponseDto {
    return {
      id: c.id,
      name: c.name,
      level: c.level,
      schoolYear: c.schoolYear,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      ...(teachers ? { teachers: teachers.map((t) => this.toClassTeacherResponse(t)) } : {}),
      ...(timeSlots ? { timeSlots: timeSlots.map((s) => this.toTimeSlotResponse(s)) } : {}),
    };
  }

  private toClassTeacherResponse(t: {
    id: string;
    classId: string;
    teacherUserId: string;
    subject: string;
    isMainTeacher: boolean;
    createdAt: Date;
    teacher?: { id: string; email: string; firstName: string; lastName: string } | null;
  }): ClassTeacherResponseDto {
    return {
      id: t.id,
      classId: t.classId,
      teacherUserId: t.teacherUserId,
      subject: t.subject,
      isMainTeacher: t.isMainTeacher,
      createdAt: t.createdAt,
      ...(t.teacher ? { teacher: t.teacher } : {}),
    };
  }

  private toTimeSlotResponse(s: {
    id: string;
    classId: string;
    dayOfWeek: number;
    periodStart: string;
    periodEnd: string;
    subject: string;
    teacherUserId: string | null;
    room: string | null;
    createdAt: Date;
    updatedAt: Date;
    teacher?: { id: string; email: string; firstName: string; lastName: string } | null;
  }): TimeSlotResponseDto {
    return {
      id: s.id,
      classId: s.classId,
      dayOfWeek: s.dayOfWeek,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      subject: s.subject,
      teacherUserId: s.teacherUserId,
      room: s.room,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      ...(s.teacher !== undefined ? { teacher: s.teacher } : {}),
    };
  }
}
