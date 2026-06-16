import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { AnnouncementAudience, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import {
  AnnouncementResponseDto,
  CreateAnnouncementDto,
  ListAnnouncementsResponseDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private toDto(a: {
    id: string; title: string; body: string; audience: string;
    kind: string; attachmentUrl: string | null;
    authorId: string; publishAt: Date; createdAt: Date; updatedAt: Date;
    author: { firstName: string; lastName: string };
  }): AnnouncementResponseDto {
    return {
      id: a.id, title: a.title, body: a.body,
      audience: a.audience as AnnouncementResponseDto['audience'],
      kind: a.kind as AnnouncementResponseDto['kind'],
      attachmentUrl: a.attachmentUrl,
      authorId: a.authorId, authorName: `${a.author.firstName} ${a.author.lastName}`,
      publishAt: a.publishAt, createdAt: a.createdAt, updatedAt: a.updatedAt,
    };
  }

  async list(user: AuthenticatedUser): Promise<ListAnnouncementsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const rows = await this.prisma.announcement.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { publishAt: 'desc' },
    });
    const items = rows.map((a) => this.toDto(a));
    return { items, total: items.length };
  }

  async create(dto: CreateAnnouncementDto, user: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const row = await this.prisma.announcement.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        authorId: user.id,
        title: dto.title,
        body: dto.body,
        audience: dto.audience ?? 'ALL',
        kind: dto.kind ?? 'NEWS',
        attachmentUrl: dto.attachmentUrl ?? null,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : new Date(),
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    // V10 — fan-out the announcement to its audience. Fire-and-forget.
    const notifyTenantId = user.tenantId;
    this.tenantContext.runDetached(() =>
      this.fanoutAnnouncementNotification(notifyTenantId, row.audience, row.title, user.id),
    );
    return this.toDto(row);
  }

  async update(id: string, dto: UpdateAnnouncementDto, user: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const existing = await this.prisma.announcement.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Announcement not found');
    if (existing.authorId !== user.id && user.role !== UserRole.SCHOOL_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only the author or an admin can edit this announcement');
    }
    const row = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.audience !== undefined && { audience: dto.audience }),
        ...(dto.publishAt !== undefined && { publishAt: new Date(dto.publishAt) }),
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    return this.toDto(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const existing = await this.prisma.announcement.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Announcement not found');
    if (existing.authorId !== user.id && user.role !== UserRole.SCHOOL_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only the author or an admin can delete this announcement');
    }
    await this.prisma.announcement.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /**
   * V10 — Fan-out a published announcement to every user in its audience
   * (excluding the author). Fire-and-forget; never blocks the create call.
   */
  private async fanoutAnnouncementNotification(
    tenantId: string,
    audience: AnnouncementAudience,
    title: string,
    authorId: string,
  ): Promise<void> {
    const roles = this.audienceToRoles(audience);
    const recipients = await this.prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        id: { not: authorId },
        ...(roles ? { role: { in: roles } } : {}),
      },
      select: { id: true },
    });
    if (recipients.length === 0) return;
    await this.fanout.fanoutAnnouncement(
      tenantId,
      recipients.map((u) => u.id),
      title,
    );
  }

  private audienceToRoles(audience: AnnouncementAudience): UserRole[] | null {
    switch (audience) {
      case AnnouncementAudience.PARENTS:
        return [UserRole.PARENT];
      case AnnouncementAudience.TEACHERS:
        return [UserRole.TEACHER];
      case AnnouncementAudience.STAFF:
        return [UserRole.STAFF];
      default:
        return null;
    }
  }
}
