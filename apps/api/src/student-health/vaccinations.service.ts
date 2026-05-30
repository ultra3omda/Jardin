import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateVaccinationDto,
  ListVaccinationsQueryDto,
  ListVaccinationsResponseDto,
  UpdateVaccinationDto,
  VaccinationResponseDto,
} from './dto/vaccination.dto';

type Row = Prisma.VaccinationGetPayload<{ include: { student: true } }>;

@Injectable()
export class VaccinationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(
    query: ListVaccinationsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListVaccinationsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.VaccinationWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.studentId) where.studentId = query.studentId;
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId =
        query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.vaccination.findMany({
        where,
        include: { student: true },
        orderBy: [{ administeredAt: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.vaccination.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<VaccinationResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.vaccination.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true },
    });
    if (!row) throw new NotFoundException({ code: 'VACCINATION_NOT_FOUND' });
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      if (!ids.includes(row.studentId)) {
        throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' });
      }
    }
    return this.toResponse(row);
  }

  async create(dto: CreateVaccinationDto, user: AuthenticatedUser): Promise<VaccinationResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    const row = await this.prisma.vaccination.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        studentId: dto.studentId,
        vaccineName: dto.vaccineName.trim(),
        administeredAt: new Date(dto.administeredAt),
        nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : null,
        notes: dto.notes ?? null,
        recordedById: user.id,
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: UpdateVaccinationDto,
    user: AuthenticatedUser,
  ): Promise<VaccinationResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.vaccination.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'VACCINATION_NOT_FOUND' });
    const row = await this.prisma.vaccination.update({
      where: { id },
      data: {
        ...(dto.vaccineName !== undefined ? { vaccineName: dto.vaccineName.trim() } : {}),
        ...(dto.administeredAt !== undefined
          ? { administeredAt: new Date(dto.administeredAt) }
          : {}),
        ...(dto.nextDueAt !== undefined
          ? { nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.vaccination.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'VACCINATION_NOT_FOUND' });
    await this.prisma.vaccination.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toResponse(r: Row): VaccinationResponseDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      vaccineName: r.vaccineName,
      administeredAt: r.administeredAt.toISOString().slice(0, 10),
      nextDueAt: r.nextDueAt ? r.nextDueAt.toISOString().slice(0, 10) : null,
      notes: r.notes,
      recordedById: r.recordedById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
