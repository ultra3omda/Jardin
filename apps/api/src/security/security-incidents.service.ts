import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateSecurityIncidentDto,
  ListSecurityIncidentsQueryDto,
  ListSecurityIncidentsResponseDto,
  ResolveSecurityIncidentDto,
  SecurityIncidentResponseDto,
  UpdateSecurityIncidentDto,
} from './dto/security-incident.dto';

type Row = Prisma.SecurityIncidentGetPayload<Record<string, never>>;

@Injectable()
export class SecurityIncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListSecurityIncidentsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListSecurityIncidentsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.SecurityIncidentWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    const [rows, total] = await Promise.all([
      this.prisma.securityIncident.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.securityIncident.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<SecurityIncidentResponseDto> {
    return this.toResponse(await this.findOrThrow(id, user));
  }

  async create(
    dto: CreateSecurityIncidentDto,
    user: AuthenticatedUser,
  ): Promise<SecurityIncidentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.securityIncident.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        type: dto.type,
        severity: dto.severity ?? 'LOW',
        location: dto.location ?? null,
        occurredAt: new Date(dto.occurredAt),
        description: dto.description,
        reportedById: user.id,
      },
    });
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: UpdateSecurityIncidentDto,
    user: AuthenticatedUser,
  ): Promise<SecurityIncidentResponseDto> {
    await this.findOrThrow(id, user);
    const row = await this.prisma.securityIncident.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.severity !== undefined ? { severity: dto.severity } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.occurredAt !== undefined ? { occurredAt: new Date(dto.occurredAt) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
    return this.toResponse(row);
  }

  async resolve(
    id: string,
    dto: ResolveSecurityIncidentDto,
    user: AuthenticatedUser,
  ): Promise<SecurityIncidentResponseDto> {
    await this.findOrThrow(id, user);
    const row = await this.prisma.securityIncident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById: user.id,
        ...(dto.resolutionNote !== undefined ? { resolutionNote: dto.resolutionNote } : {}),
      },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.findOrThrow(id, user);
    await this.prisma.securityIncident.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async findOrThrow(id: string, user: AuthenticatedUser): Promise<Row> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.securityIncident.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException({ code: 'SECURITY_INCIDENT_NOT_FOUND' });
    return row;
  }

  private toResponse(r: Row): SecurityIncidentResponseDto {
    return {
      id: r.id,
      type: r.type,
      severity: r.severity,
      location: r.location,
      occurredAt: r.occurredAt.toISOString(),
      description: r.description,
      status: r.status,
      resolutionNote: r.resolutionNote,
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      reportedById: r.reportedById,
      resolvedById: r.resolvedById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
