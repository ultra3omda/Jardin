import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateSafetyDrillDto,
  ListSafetyDrillsResponseDto,
  SafetyDrillResponseDto,
  UpdateSafetyDrillDto,
} from './dto/safety-drill.dto';

type Row = Prisma.SafetyDrillGetPayload<Record<string, never>>;

@Injectable()
export class SafetyDrillsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser): Promise<ListSafetyDrillsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.SafetyDrillWhereInput = { tenantId: user.tenantId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.safetyDrill.findMany({ where, orderBy: { conductedAt: 'desc' }, take: 500 }),
      this.prisma.safetyDrill.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<SafetyDrillResponseDto> {
    return this.toResponse(await this.findOrThrow(id, user));
  }

  async create(dto: CreateSafetyDrillDto, user: AuthenticatedUser): Promise<SafetyDrillResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.safetyDrill.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        type: dto.type,
        conductedAt: new Date(dto.conductedAt),
        durationMin: dto.durationMin ?? null,
        notes: dto.notes ?? null,
        recordedById: user.id,
      },
    });
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: UpdateSafetyDrillDto,
    user: AuthenticatedUser,
  ): Promise<SafetyDrillResponseDto> {
    await this.findOrThrow(id, user);
    const row = await this.prisma.safetyDrill.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.conductedAt !== undefined ? { conductedAt: new Date(dto.conductedAt) } : {}),
        ...(dto.durationMin !== undefined ? { durationMin: dto.durationMin } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.findOrThrow(id, user);
    await this.prisma.safetyDrill.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async findOrThrow(id: string, user: AuthenticatedUser): Promise<Row> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.safetyDrill.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException({ code: 'SAFETY_DRILL_NOT_FOUND' });
    return row;
  }

  private toResponse(r: Row): SafetyDrillResponseDto {
    return {
      id: r.id,
      type: r.type,
      conductedAt: r.conductedAt.toISOString(),
      durationMin: r.durationMin,
      notes: r.notes,
      recordedById: r.recordedById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
