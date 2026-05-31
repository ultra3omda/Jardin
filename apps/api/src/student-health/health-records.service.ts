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
  CreateHealthRecordDto,
  HealthRecordResponseDto,
  ListHealthRecordsQueryDto,
  ListHealthRecordsResponseDto,
  UpdateHealthRecordDto,
} from './dto/health-record.dto';

type Row = Prisma.HealthRecordGetPayload<{ include: { student: true } }>;

@Injectable()
export class HealthRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(
    query: ListHealthRecordsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListHealthRecordsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.HealthRecordWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.studentId) where.studentId = query.studentId;
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId =
        query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.healthRecord.findMany({
        where,
        include: { student: true },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
      this.prisma.healthRecord.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<HealthRecordResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.healthRecord.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true },
    });
    if (!row) throw new NotFoundException({ code: 'HEALTH_RECORD_NOT_FOUND' });
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      if (!ids.includes(row.studentId)) {
        throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' });
      }
    }
    return this.toResponse(row);
  }

  async create(
    dto: CreateHealthRecordDto,
    user: AuthenticatedUser,
  ): Promise<HealthRecordResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    try {
      const row = await this.prisma.healthRecord.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          studentId: dto.studentId,
          bloodType: dto.bloodType ?? null,
          allergies: dto.allergies ?? null,
          chronicConditions: dto.chronicConditions ?? null,
          medications: dto.medications ?? null,
          dietaryRestrictions: dto.dietaryRestrictions ?? null,
          doctorName: dto.doctorName ?? null,
          doctorPhone: dto.doctorPhone ?? null,
          emergencyContactName: dto.emergencyContactName ?? null,
          emergencyContactPhone: dto.emergencyContactPhone ?? null,
          notes: dto.notes ?? null,
          updatedById: user.id,
        },
        include: { student: true },
      });
      return this.toResponse(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'HEALTH_RECORD_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: UpdateHealthRecordDto,
    user: AuthenticatedUser,
  ): Promise<HealthRecordResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.healthRecord.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'HEALTH_RECORD_NOT_FOUND' });
    const row = await this.prisma.healthRecord.update({
      where: { id },
      data: {
        ...(dto.bloodType !== undefined ? { bloodType: dto.bloodType } : {}),
        ...(dto.allergies !== undefined ? { allergies: dto.allergies } : {}),
        ...(dto.chronicConditions !== undefined
          ? { chronicConditions: dto.chronicConditions }
          : {}),
        ...(dto.medications !== undefined ? { medications: dto.medications } : {}),
        ...(dto.dietaryRestrictions !== undefined
          ? { dietaryRestrictions: dto.dietaryRestrictions }
          : {}),
        ...(dto.doctorName !== undefined ? { doctorName: dto.doctorName } : {}),
        ...(dto.doctorPhone !== undefined ? { doctorPhone: dto.doctorPhone } : {}),
        ...(dto.emergencyContactName !== undefined
          ? { emergencyContactName: dto.emergencyContactName }
          : {}),
        ...(dto.emergencyContactPhone !== undefined
          ? { emergencyContactPhone: dto.emergencyContactPhone }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedById: user.id,
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.healthRecord.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'HEALTH_RECORD_NOT_FOUND' });
    await this.prisma.healthRecord.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toResponse(r: Row): HealthRecordResponseDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      bloodType: r.bloodType,
      allergies: r.allergies,
      chronicConditions: r.chronicConditions,
      medications: r.medications,
      dietaryRestrictions: r.dietaryRestrictions,
      doctorName: r.doctorName,
      doctorPhone: r.doctorPhone,
      emergencyContactName: r.emergencyContactName,
      emergencyContactPhone: r.emergencyContactPhone,
      notes: r.notes,
      updatedById: r.updatedById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
