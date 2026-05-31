import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateVisitorLogDto,
  ListVisitorLogsResponseDto,
  UpdateVisitorLogDto,
  VisitorLogResponseDto,
} from './dto/visitor-log.dto';

type Row = Prisma.VisitorLogGetPayload<Record<string, never>>;

@Injectable()
export class VisitorLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser): Promise<ListVisitorLogsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.VisitorLogWhereInput = { tenantId: user.tenantId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.visitorLog.findMany({ where, orderBy: { checkInAt: 'desc' }, take: 500 }),
      this.prisma.visitorLog.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<VisitorLogResponseDto> {
    return this.toResponse(await this.findOrThrow(id, user));
  }

  async create(dto: CreateVisitorLogDto, user: AuthenticatedUser): Promise<VisitorLogResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.visitorLog.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        visitorName: dto.visitorName.trim(),
        reason: dto.reason ?? null,
        checkInAt: new Date(dto.checkInAt),
        checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
        badgeNumber: dto.badgeNumber ?? null,
        recordedById: user.id,
      },
    });
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: UpdateVisitorLogDto,
    user: AuthenticatedUser,
  ): Promise<VisitorLogResponseDto> {
    await this.findOrThrow(id, user);
    const row = await this.prisma.visitorLog.update({
      where: { id },
      data: {
        ...(dto.visitorName !== undefined ? { visitorName: dto.visitorName.trim() } : {}),
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
        ...(dto.checkInAt !== undefined ? { checkInAt: new Date(dto.checkInAt) } : {}),
        ...(dto.checkOutAt !== undefined
          ? { checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null }
          : {}),
        ...(dto.badgeNumber !== undefined ? { badgeNumber: dto.badgeNumber } : {}),
      },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.findOrThrow(id, user);
    await this.prisma.visitorLog.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async findOrThrow(id: string, user: AuthenticatedUser): Promise<Row> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.visitorLog.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException({ code: 'VISITOR_LOG_NOT_FOUND' });
    return row;
  }

  private toResponse(r: Row): VisitorLogResponseDto {
    return {
      id: r.id,
      visitorName: r.visitorName,
      reason: r.reason,
      checkInAt: r.checkInAt.toISOString(),
      checkOutAt: r.checkOutAt ? r.checkOutAt.toISOString() : null,
      badgeNumber: r.badgeNumber,
      recordedById: r.recordedById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
