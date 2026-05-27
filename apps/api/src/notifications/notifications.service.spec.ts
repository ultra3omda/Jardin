/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationType } from './dto/notification.dto';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_A = 'tenant_A';
const TENANT_B = 'tenant_B';

const USER_A: AuthenticatedUser = {
  id: 'user_A',
  email: 'a@school.tn',
  tenantId: TENANT_A,
  role: UserRole.SCHOOL_ADMIN,
};

const USER_B: AuthenticatedUser = {
  id: 'user_B',
  email: 'b@school.tn',
  tenantId: TENANT_A,
  role: UserRole.PARENT,
};

function makeNotification(
  overrides: Partial<{
    id: string;
    tenantId: string;
    userId: string;
    type: NotificationType;
    readAt: Date | null;
  }> = {},
) {
  return {
    id: overrides.id ?? 'notif_1',
    tenantId: overrides.tenantId ?? TENANT_A,
    userId: overrides.userId ?? USER_A.id,
    type: overrides.type ?? NotificationType.SYSTEM,
    title: 'Test title',
    body: 'Test body',
    data: null,
    readAt: overrides.readAt ?? null,
    createdAt: new Date('2026-05-27T12:00:00Z'),
  };
}

function makePrismaMock() {
  return {
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const module = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(NotificationsService);
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated items with total and unreadCount', async () => {
      const notifs = [makeNotification(), makeNotification({ id: 'notif_2' })];
      prisma.notification.findMany.mockResolvedValueOnce(notifs);
      prisma.notification.count
        .mockResolvedValueOnce(2)  // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await service.findAll(TENANT_A, USER_A.id, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.unreadCount).toBe(1);
    });

    it('applies unreadOnly filter — passes readAt:null to Prisma where clause', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(TENANT_A, USER_A.id, { unreadOnly: true });

      const findManyCall = prisma.notification.findMany.mock.calls[0][0] as any;
      expect(findManyCall.where).toMatchObject({ readAt: null });
    });

    it('does NOT apply readAt filter when unreadOnly is false', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(TENANT_A, USER_A.id, { unreadOnly: false });

      const findManyCall = prisma.notification.findMany.mock.calls[0][0] as any;
      expect(findManyCall.where).not.toHaveProperty('readAt');
    });

    it('orders results by createdAt DESC', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(TENANT_A, USER_A.id, {});

      const findManyCall = prisma.notification.findMany.mock.calls[0][0] as any;
      expect(findManyCall.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('applies correct skip/take for page 2 with limit 5', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(TENANT_A, USER_A.id, { page: 2, limit: 5 });

      const findManyCall = prisma.notification.findMany.mock.calls[0][0] as any;
      expect(findManyCall.skip).toBe(5);
      expect(findManyCall.take).toBe(5);
    });

    it('scopes query by tenantId and userId', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(TENANT_A, USER_A.id, {});

      const findManyCall = prisma.notification.findMany.mock.calls[0][0] as any;
      expect(findManyCall.where).toMatchObject({ tenantId: TENANT_A, userId: USER_A.id });
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a notification with correct tenantId and userId', async () => {
      const created = makeNotification({ type: NotificationType.GRADE });
      prisma.notification.create.mockResolvedValueOnce(created);

      const dto = {
        userId: USER_A.id,
        type: NotificationType.GRADE,
        title: 'New grade',
        body: 'You received a grade for Maths',
      };
      const result = await service.create(TENANT_A, dto);

      expect(result.tenantId).toBe(TENANT_A);
      expect(result.userId).toBe(USER_A.id);
      expect(result.type).toBe(NotificationType.GRADE);

      const createCall = prisma.notification.create.mock.calls[0][0] as any;
      expect(createCall.data).toMatchObject({
        tenantId: TENANT_A,
        userId: USER_A.id,
        type: NotificationType.GRADE,
        title: 'New grade',
        body: 'You received a grade for Maths',
      });
    });

    it('generates a unique id (cuid) for each notification', async () => {
      const created = makeNotification();
      prisma.notification.create.mockResolvedValueOnce(created);

      await service.create(TENANT_A, {
        userId: USER_A.id,
        type: NotificationType.SYSTEM,
        title: 'Hello',
        body: 'World',
      });

      const createCall = prisma.notification.create.mock.calls[0][0] as any;
      expect(typeof createCall.data.id).toBe('string');
      expect(createCall.data.id.length).toBeGreaterThan(0);
    });
  });

  // ── markRead ─────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('with specific ids — verifies ownership before updating', async () => {
      const notif = makeNotification({ id: 'notif_X', userId: USER_A.id });
      prisma.notification.findMany.mockResolvedValueOnce([notif]);
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.markRead(TENANT_A, USER_A.id, ['notif_X']);

      const findManyCall = prisma.notification.findMany.mock.calls[0][0] as any;
      expect(findManyCall.where).toMatchObject({
        id: { in: ['notif_X'] },
        tenantId: TENANT_A,
        userId: USER_A.id,
      });
    });

    it('with specific ids — throws NotFoundException if an id does not belong to user', async () => {
      // USER_B tries to mark a notification owned by USER_A — ownership check returns 0
      prisma.notification.findMany.mockResolvedValueOnce([]);

      await expect(
        service.markRead(TENANT_A, USER_B.id, ['notif_owned_by_A']),
      ).rejects.toThrow(NotFoundException);
    });

    it('with specific ids — does not mark notifications from another tenant', async () => {
      // tenantId filter blocks the record, ownership check returns 0
      prisma.notification.findMany.mockResolvedValueOnce([]);

      await expect(
        service.markRead(TENANT_B, USER_A.id, ['notif_1']),
      ).rejects.toThrow(NotFoundException);
    });

    it('with empty ids — calls updateMany with readAt:null filter (mark all)', async () => {
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 5 });

      await service.markRead(TENANT_A, USER_A.id, []);

      expect(prisma.notification.findMany).not.toHaveBeenCalled();
      const updateCall = prisma.notification.updateMany.mock.calls[0][0] as any;
      expect(updateCall.where).toMatchObject({
        tenantId: TENANT_A,
        userId: USER_A.id,
        readAt: null,
      });
    });

    it('with undefined ids — same behaviour as empty array (mark all)', async () => {
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 3 });

      await service.markRead(TENANT_A, USER_A.id, undefined);

      const updateCall = prisma.notification.updateMany.mock.calls[0][0] as any;
      expect(updateCall.where).toMatchObject({ readAt: null });
    });
  });

  // ── markAllRead ───────────────────────────────────────────────────────────

  describe('markAllRead', () => {
    it('delegates to markRead with no ids — marks all unread for user', async () => {
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 4 });

      await service.markAllRead(TENANT_A, USER_A.id);

      expect(prisma.notification.updateMany).toHaveBeenCalledOnce();
      const updateCall = prisma.notification.updateMany.mock.calls[0][0] as any;
      expect(updateCall.where).toMatchObject({
        tenantId: TENANT_A,
        userId: USER_A.id,
        readAt: null,
      });
    });
  });

  // ── getUnreadCount ────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns the correct count from Prisma', async () => {
      prisma.notification.count.mockResolvedValueOnce(7);

      const result = await service.getUnreadCount(TENANT_A, USER_A.id);

      expect(result.count).toBe(7);
    });

    it('scopes count by tenantId, userId and readAt:null', async () => {
      prisma.notification.count.mockResolvedValueOnce(0);

      await service.getUnreadCount(TENANT_A, USER_A.id);

      const countCall = prisma.notification.count.mock.calls[0][0] as any;
      expect(countCall.where).toEqual({ tenantId: TENANT_A, userId: USER_A.id, readAt: null });
    });

    it('returns 0 when no unread notifications exist', async () => {
      prisma.notification.count.mockResolvedValueOnce(0);

      const result = await service.getUnreadCount(TENANT_A, USER_A.id);

      expect(result.count).toBe(0);
    });
  });
});
