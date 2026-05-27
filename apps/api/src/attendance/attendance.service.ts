import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  AttendanceResponseDto,
  BulkAttendanceDto,
  ListAttendanceResponseDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

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
}
