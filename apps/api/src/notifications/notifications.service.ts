import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';

import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateNotificationDto,
  ListNotificationsResponseDto,
  NotificationQueryDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
} from './dto/notification.dto';

/**
 * V8 — Notifications service.
 *
 * Invariants enforced:
 *  - Every Prisma query is scoped by tenantId (multi-tenant isolation).
 *  - markRead verifies userId ownership before updating.
 *  - create() is intentionally not exposed via HTTP — other services call it
 *    directly to fan-out notifications to users.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Query ────────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    userId: string,
    query: NotificationQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { tenantId, userId, readAt: null },
      }),
    ]);

    return {
      items: items.map((n) => this.toResponse(n)),
      total,
      unreadCount,
    };
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<UnreadCountResponseDto> {
    const count = await this.prisma.notification.count({
      where: { tenantId, userId, readAt: null },
    });
    return { count };
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * Internal fan-out method. Not exposed via HTTP.
   * Other services (messaging, grades, finance, …) call this to notify users.
   */
  async create(tenantId: string, dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.create({
      data: {
        id: createId(),
        tenantId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: (dto.data ?? undefined) as any,
      },
    });
    this.logger.debug(
      `Notification created: id=${notification.id} userId=${dto.userId} type=${dto.type}`,
    );
    return this.toResponse(notification);
  }

  /**
   * Mark specific notifications as read.
   * If `ids` is empty or undefined, marks ALL unread notifications for the
   * user as read (convenience "mark all" behaviour).
   *
   * Throws NotFoundException when specific IDs are provided but some are not
   * found / don't belong to the user, to prevent silent no-ops.
   */
  async markRead(tenantId: string, userId: string, ids?: string[]): Promise<void> {
    const now = new Date();

    if (!ids || ids.length === 0) {
      await this.prisma.notification.updateMany({
        where: { tenantId, userId, readAt: null },
        data: { readAt: now },
      });
      return;
    }

    // Verify every requested ID belongs to this user within this tenant.
    const owned = await this.prisma.notification.findMany({
      where: { id: { in: ids }, tenantId, userId },
      select: { id: true },
    });

    if (owned.length !== ids.length) {
      const foundIds = new Set(owned.map((n) => n.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        ids: missing,
      });
    }

    await this.prisma.notification.updateMany({
      where: { id: { in: ids }, tenantId, userId },
      data: { readAt: now },
    });
  }

  /**
   * Convenience: mark every notification for the user as read.
   */
  async markAllRead(tenantId: string, userId: string): Promise<void> {
    return this.markRead(tenantId, userId);
  }

  /**
   * Single-notification read with ownership check.
   * Used by the controller for `POST /notifications/:id/read`.
   */
  async markOneRead(tenantId: string, userId: string, id: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId, userId },
      select: { id: true },
    });
    if (!notification) {
      throw new NotFoundException({ code: 'NOTIFICATION_NOT_FOUND' });
    }
    await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private toResponse(n: {
    id: string;
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    data: unknown;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationResponseDto {
    return {
      id: n.id,
      tenantId: n.tenantId,
      userId: n.userId,
      type: n.type as NotificationResponseDto['type'],
      title: n.title,
      body: n.body,
      data: n.data as Record<string, unknown> | null,
      readAt: n.readAt,
      createdAt: n.createdAt,
    };
  }
}
