import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../common/prisma/prisma.service';
import { RequestMeta } from '../auth/utils/request-meta.utils';
import { AuditEntryDto, AuditListDto, AuditQueryDto } from './dto/audit.dto';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

type AuditRow = Prisma.AuditLogGetPayload<{
  include: { user: { select: { email: true } }; tenant: { select: { slug: true; name: true } } };
}>;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(viewerId: string, query: AuditQueryDto, meta: RequestMeta): Promise<AuditListDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize && query.pageSize > 0 ? query.pageSize : DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { email: true } }, tenant: { select: { slug: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    await this.recordView(viewerId, meta);
    return { items: rows.map((row) => this.toDto(row)), total, page, pageSize };
  }

  private buildWhere(query: AuditQueryDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.resource) where.resource = query.resource;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    return where;
  }

  private toDto(row: AuditRow): AuditEntryDto {
    return {
      id: row.id,
      action: row.action,
      resource: row.resource,
      tenantId: row.tenantId,
      tenantSlug: row.tenant?.slug ?? null,
      tenantName: row.tenant?.name ?? null,
      userId: row.userId,
      userEmail: row.user?.email ?? null,
      ip: row.ip,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async recordView(viewerId: string, meta: RequestMeta): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action: 'admin.audit.viewed',
          resource: 'audit',
          tenantId: null,
          userId: viewerId,
          metadata: {},
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`audit admin.audit.viewed failed: ${String(err)}`);
    }
  }
}
