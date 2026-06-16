/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import { MessagingService } from './messaging.service';

const tenantA = 'tenant_A';
const userA: AuthenticatedUser = {
  id: 'user_A',
  email: 'a@school.tn',
  tenantId: tenantA,
  role: UserRole.SCHOOL_ADMIN,
};
const userB = { id: 'user_B' };

function makePrismaMock() {
  return {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    conversation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    conversationParticipant: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('MessagingService', () => {
  let service: MessagingService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let fanout: { fanoutMessage: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = makePrismaMock();
    fanout = { fanoutMessage: vi.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationFanoutService, useValue: fanout },
        {
          provide: TenantContextService,
          useValue: {
            runDetached: (fn: () => unknown) => {
              void Promise.resolve().then(fn).catch(() => undefined);
            },
          },
        },
      ],
    }).compile();
    service = module.get(MessagingService);
  });

  it('createOrGetConversation returns existing conversation when one exists between users', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: userB.id });
    prisma.conversation.findFirst.mockResolvedValueOnce({
      id: 'conv_1',
      tenantId: tenantA,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      participants: [
        { userId: userA.id, lastReadAt: null, user: { id: userA.id, firstName: 'A', lastName: 'A', email: 'a@school.tn' } },
        { userId: userB.id, lastReadAt: null, user: { id: userB.id, firstName: 'B', lastName: 'B', email: 'b@school.tn' } },
      ],
      messages: [],
    });
    const res = await service.createOrGetConversation({ recipientUserId: userB.id }, userA);
    expect(res.id).toBe('conv_1');
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });

  it('listContacts scopes a PARENT to teachers & admins, excluding self', async () => {
    const parent: AuthenticatedUser = { ...userA, id: 'parent_1', role: UserRole.PARENT };
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 't1', firstName: 'T', lastName: 'One', email: 't1@s.tn', role: UserRole.TEACHER },
    ]);
    const res = await service.listContacts(parent);
    expect(res.items).toEqual([
      { userId: 't1', firstName: 'T', lastName: 'One', email: 't1@s.tn', role: UserRole.TEACHER },
    ]);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role.in).toEqual([UserRole.TEACHER, UserRole.SCHOOL_ADMIN]);
    expect(where.id).toEqual({ not: 'parent_1' });
    expect(where.tenantId).toBe(tenantA);
    expect(where.deletedAt).toBeNull();
  });

  it('listContacts gives staff/admin the full tenant directory', async () => {
    prisma.user.findMany.mockResolvedValueOnce([]);
    await service.listContacts(userA);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role.in).toEqual([
      UserRole.SCHOOL_ADMIN,
      UserRole.TEACHER,
      UserRole.STAFF,
      UserRole.PARENT,
    ]);
  });

  it('listContacts requires a tenant', async () => {
    await expect(
      service.listContacts({ ...userA, tenantId: null } as AuthenticatedUser),
    ).rejects.toMatchObject({ response: { code: 'TENANT_REQUIRED' } });
  });

  it('createOrGetConversation rejects messaging self', async () => {
    await expect(
      service.createOrGetConversation({ recipientUserId: userA.id }, userA),
    ).rejects.toMatchObject({ response: { code: 'CANNOT_MESSAGE_SELF' } });
  });

  it('createOrGetConversation 404s when recipient not found in tenant', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.createOrGetConversation({ recipientUserId: 'ghost' }, userA),
    ).rejects.toMatchObject({ response: { code: 'RECIPIENT_NOT_FOUND' } });
  });

  it('sendMessage 403s when caller is not a participant', async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce({
      tenantId: tenantA,
      participants: [{ userId: 'someoneelse' }, { userId: 'another' }],
    });
    await expect(
      service.sendMessage({ conversationId: 'c_x', body: 'hi' }, userA),
    ).rejects.toMatchObject({ response: { code: 'NOT_A_PARTICIPANT' } });
  });

  it('sendMessage persists and bumps conversation updatedAt', async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce({
      tenantId: tenantA,
      participants: [{ userId: userA.id }, { userId: userB.id }],
    });
    prisma.message.create.mockResolvedValueOnce({
      id: 'm_1',
      conversationId: 'c_1',
      senderId: userA.id,
      body: 'Hello',
      createdAt: new Date(),
      readAt: null,
    });
    prisma.conversation.update.mockResolvedValueOnce({});
    // V10 fan-out is fire-and-forget; no other participants → returns early.
    prisma.conversationParticipant.findMany.mockResolvedValueOnce([]);
    const msg = await service.sendMessage({ conversationId: 'c_1', body: 'Hello' }, userA);
    expect(msg.body).toBe('Hello');
    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'c_1' },
      data: { updatedAt: expect.any(Date) },
    });
  });

  it('listMessages returns ascending order and hasMore=false when under limit', async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce({
      tenantId: tenantA,
      participants: [{ userId: userA.id }],
    });
    const t = new Date('2026-05-26T17:00:00Z');
    prisma.message.findMany.mockResolvedValueOnce([
      { id: 'm3', conversationId: 'c_1', senderId: userA.id, body: 'c', createdAt: new Date(+t + 2), readAt: null },
      { id: 'm2', conversationId: 'c_1', senderId: userA.id, body: 'b', createdAt: new Date(+t + 1), readAt: null },
      { id: 'm1', conversationId: 'c_1', senderId: userA.id, body: 'a', createdAt: t, readAt: null },
    ]);
    const res = await service.listMessages('c_1', { limit: 50 }, userA);
    expect(res.hasMore).toBe(false);
    expect(res.items.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('getOtherParticipantIds excludes the sender', async () => {
    prisma.conversationParticipant.findMany.mockResolvedValueOnce([{ userId: userB.id }]);
    const ids = await service.getOtherParticipantIds('c_1', userA.id);
    expect(ids).toEqual([userB.id]);
    expect(prisma.conversationParticipant.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'c_1', userId: { not: userA.id } },
      select: { userId: true },
    });
  });
});
