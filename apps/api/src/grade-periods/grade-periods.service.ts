import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateGradePeriodDto,
  GradePeriodResponseDto,
  ListGradePeriodsResponseDto,
  UpdateGradePeriodDto,
} from './dto/grade-period.dto';

@Injectable()
export class GradePeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Derive school year from start date: months ≥ 7 (July) → "Y/Y+1", otherwise "(Y-1)/Y". */
  private deriveSchoolYear(startDate: Date): string {
    const y = startDate.getFullYear();
    const m = startDate.getMonth() + 1; // 1-12
    return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  }

  async create(dto: CreateGradePeriodDto, user: AuthenticatedUser): Promise<GradePeriodResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE' });
    }
    // schoolYear is optional — auto-derive from startDate when absent.
    const schoolYear = dto.schoolYear ?? this.deriveSchoolYear(start);
    if (!/^\d{4}-\d{4}$/.test(schoolYear)) {
      throw new BadRequestException({ code: 'INVALID_SCHOOL_YEAR' });
    }
    try {
      const created = await this.prisma.gradePeriod.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          name: dto.name,
          schoolYear,
          startDate: start,
          endDate: end,
          isClosed: false,
        },
      });
      return this.toResponse(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'PERIOD_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async list(user: AuthenticatedUser, schoolYear?: string): Promise<ListGradePeriodsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.GradePeriodWhereInput = {
      tenantId: user.tenantId,
      ...(schoolYear ? { schoolYear } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.gradePeriod.findMany({
        where,
        orderBy: [{ schoolYear: 'desc' }, { startDate: 'asc' }],
      }),
      this.prisma.gradePeriod.count({ where }),
    ]);
    return { items: items.map((p) => this.toResponse(p)), total };
  }

  async update(id: string, dto: UpdateGradePeriodDto, user: AuthenticatedUser): Promise<GradePeriodResponseDto> {
    const existing = await this.prisma.gradePeriod.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND' });

    const nextStart = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const nextEnd = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    if (nextEnd <= nextStart) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE' });
    }

    const updated = await this.prisma.gradePeriod.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isClosed !== undefined ? { isClosed: dto.isClosed } : {}),
      },
    });
    return this.toResponse(updated);
  }

  async close(id: string, user: AuthenticatedUser): Promise<GradePeriodResponseDto> {
    const existing = await this.prisma.gradePeriod.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND' });
    const updated = await this.prisma.gradePeriod.update({
      where: { id },
      data: { isClosed: true },
    });
    return this.toResponse(updated);
  }

  /**
   * Delete a grade period. Blocked when it still has evaluations or bulletins
   * (FK is onDelete: Restrict) — the caller must reassign/remove those first.
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.prisma.gradePeriod.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND' });

    const [evaluations, bulletins] = await Promise.all([
      this.prisma.evaluation.count({ where: { gradePeriodId: id } }),
      this.prisma.bulletin.count({ where: { gradePeriodId: id } }),
    ]);
    if (evaluations + bulletins > 0) {
      throw new BadRequestException({ code: 'PERIOD_IN_USE' });
    }

    await this.prisma.gradePeriod.delete({ where: { id } });
  }

  private toResponse(p: {
    id: string;
    name: string;
    schoolYear: string;
    startDate: Date;
    endDate: Date;
    isClosed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): GradePeriodResponseDto {
    return {
      id: p.id,
      name: p.name,
      schoolYear: p.schoolYear,
      startDate: p.startDate,
      endDate: p.endDate,
      isClosed: p.isClosed,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
