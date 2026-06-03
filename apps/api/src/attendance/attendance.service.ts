import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { AttendanceStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import {
  AttendanceEntryDto,
  AttendanceResponseDto,
  BulkAttendanceDto,
  ListAttendanceResponseDto,
  MyChildrenAttendanceResponseDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

/** How many recent attendance records a parent sees per request. */
const MY_CHILDREN_ATTENDANCE_LIMIT = 60;

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
  ) {}

  private toDto(a: {
    id: string; studentId: string; classId: string | null;
    date: Date; status: string; notes: string | null; recordedById: string;
  }): AttendanceResponseDto {
    return {
      id: a.id, studentId: a.studentId, classId: a.classId,
      date: a.date.toISOString().split('T')[0],
      status: a.status as AttendanceResponseDto['status'],
      notes: a.notes, recordedById: a.recordedById,
    };
  }

  async listByClassAndDate(
    classId: string,
    date: string,
    user: AuthenticatedUser,
  ): Promise<ListAttendanceResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const rows = await this.prisma.attendance.findMany({
      where: { tenantId: user.tenantId, classId, date: new Date(date) },
      orderBy: { studentId: 'asc' },
    });
    return { items: rows.map((r) => this.toDto(r)), total: rows.length };
  }

  /** Read-only recent attendance for the connected parent's children. */
  async myChildrenAttendance(user: AuthenticatedUser): Promise<MyChildrenAttendanceResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const links = await this.prisma.parentStudent.findMany({
      where: { tenantId: user.tenantId, parentUserId: user.id },
      select: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (links.length === 0) return { items: [], total: 0 };
    const nameById = new Map(
      links.map((l) => [l.student.id, `${l.student.firstName} ${l.student.lastName}`.trim()]),
    );
    const rows = await this.prisma.attendance.findMany({
      where: { tenantId: user.tenantId, studentId: { in: [...nameById.keys()] } },
      orderBy: { date: 'desc' },
      take: MY_CHILDREN_ATTENDANCE_LIMIT,
    });
    return {
      items: rows.map((r) => ({
        studentId: r.studentId,
        studentName: nameById.get(r.studentId) ?? '',
        date: r.date.toISOString().split('T')[0],
        status: r.status as MyChildrenAttendanceResponseDto['items'][number]['status'],
        notes: r.notes,
      })),
      total: rows.length,
    };
  }

  async bulkUpsert(dto: BulkAttendanceDto, user: AuthenticatedUser): Promise<AttendanceResponseDto[]> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const dateObj = new Date(dto.date);
    const results = await this.prisma.$transaction(
      dto.entries.map((entry) =>
        this.prisma.attendance.upsert({
          where: {
            unique_attendance_per_day: {
              tenantId: user.tenantId!,
              studentId: entry.studentId,
              date: dateObj,
            },
          },
          create: {
            id: createId(),
            tenantId: user.tenantId!,
            studentId: entry.studentId,
            classId: dto.classId,
            date: dateObj,
            status: entry.status,
            notes: entry.notes ?? null,
            recordedById: user.id,
          },
          update: {
            status: entry.status,
            notes: entry.notes ?? null,
            recordedById: user.id,
          },
        }),
      ),
    );
    // V10 — notify parents of any newly recorded absence. Fire-and-forget.
    void this.fanoutAbsences(user.tenantId, dateObj, dto.entries);
    return results.map((r) => this.toDto(r));
  }

  async update(id: string, dto: UpdateAttendanceDto, user: AuthenticatedUser): Promise<AttendanceResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const existing = await this.prisma.attendance.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Attendance record not found');
    const row = await this.prisma.attendance.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
    return this.toDto(row);
  }

  /**
   * V10 — Fan-out an absence notification to each parent of every student
   * marked ABSENT or EXCUSED. Fire-and-forget; never blocks the bulk save.
   */
  private async fanoutAbsences(
    tenantId: string,
    date: Date,
    entries: AttendanceEntryDto[],
  ): Promise<void> {
    const absences = entries.filter(
      (e) => e.status === AttendanceStatus.ABSENT || e.status === AttendanceStatus.EXCUSED,
    );
    if (absences.length === 0) return;
    await Promise.allSettled(
      absences.map((e) =>
        this.notifyAbsence(tenantId, e.studentId, date, e.status === AttendanceStatus.EXCUSED),
      ),
    );
  }

  private async notifyAbsence(
    tenantId: string,
    studentId: string,
    date: Date,
    justified: boolean,
  ): Promise<void> {
    const parents = await this.prisma.parentStudent.findMany({
      where: { tenantId, studentId },
      select: { parentUserId: true },
    });
    if (parents.length === 0) return;
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
      select: { firstName: true, lastName: true },
    });
    if (!student) return;
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    await Promise.allSettled(
      parents.map((p) =>
        this.fanout.fanoutAbsence(tenantId, p.parentUserId, studentName, date, justified),
      ),
    );
  }
}
