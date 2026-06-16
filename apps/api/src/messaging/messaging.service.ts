import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import type {
  ContactsResponseDto,
  ConversationResponseDto,
  CreateConversationDto,
  ListConversationsResponseDto,
  ListMessagesQueryDto,
  ListMessagesResponseDto,
  MessageResponseDto,
  ParticipantSummary,
  SendMessageDto,
} from './dto/messaging.dto';

/**
 * V3-B — Messaging 1:1 service.
 *
 * Invariants enforced :
 *  - Conversations strictly 2 participants of the same tenant
 *  - sender is a participant when sending a message
 *  - tenantId enforced on every query (multi-tenant isolation per CLAUDE.md)
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ───── Conversations ─────

  async createOrGetConversation(
    dto: CreateConversationDto,
    user: AuthenticatedUser,
  ): Promise<ConversationResponseDto> {
    if (!user.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    if (dto.recipientUserId === user.id) {
      throw new BadRequestException({ code: 'CANNOT_MESSAGE_SELF' });
    }
    const recipient = await this.prisma.user.findFirst({
      where: { id: dto.recipientUserId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!recipient) {
      throw new NotFoundException({ code: 'RECIPIENT_NOT_FOUND' });
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        tenantId: user.tenantId,
        AND: [
          { participants: { some: { userId: user.id } } },
          { participants: { some: { userId: dto.recipientUserId } } },
        ],
      },
      include: this.conversationInclude(),
    });
    if (existing) {
      return this.toConversationResponse(existing, user.id);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        participants: {
          create: [{ userId: user.id }, { userId: dto.recipientUserId }],
        },
      },
      include: this.conversationInclude(),
    });
    return this.toConversationResponse(conversation, user.id);
  }

  async listConversations(user: AuthenticatedUser): Promise<ListConversationsResponseDto> {
    if (!user.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId: user.tenantId,
        participants: { some: { userId: user.id } },
      },
      include: this.conversationInclude(),
      orderBy: { updatedAt: 'desc' },
    });
    return {
      items: conversations.map((c) => this.toConversationResponse(c, user.id)),
    };
  }

  /**
   * Users the caller may start a 1:1 conversation with, scoped by role:
   *  - PARENT → teachers & school admins only
   *  - TEACHER / STAFF / SCHOOL_ADMIN → everyone in the tenant (minus self)
   * Self and soft-deleted users are always excluded.
   */
  async listContacts(user: AuthenticatedUser): Promise<ContactsResponseDto> {
    if (!user.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    const targetRoles: UserRole[] =
      user.role === UserRole.PARENT
        ? [UserRole.TEACHER, UserRole.SCHOOL_ADMIN]
        : [UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT];

    const users = await this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        id: { not: user.id },
        role: { in: targetRoles },
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });
    return {
      items: users.map((u) => ({
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
      })),
    };
  }

  // ───── Messages ─────

  async sendMessage(dto: SendMessageDto, user: AuthenticatedUser): Promise<MessageResponseDto> {
    if (!user.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    const conversation = await this.assertParticipant(dto.conversationId, user);
    const created = await this.prisma.message.create({
      data: {
        id: createId(),
        tenantId: conversation.tenantId,
        conversationId: dto.conversationId,
        senderId: user.id,
        body: dto.body,
      },
    });
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });
    // V10 — fan-out a notification to the other participant(s). Fire-and-forget:
    // delivery never blocks (or fails) the message send.
    this.tenantContext.runDetached(() =>
      this.fanoutNewMessage(conversation.tenantId, dto.conversationId, user),
    );
    return this.toMessageResponse(created);
  }

  /**
   * V10 — Notify every other participant of a new message across in-app,
   * email and push channels. Resolves the sender's display name once.
   */
  private async fanoutNewMessage(
    tenantId: string,
    conversationId: string,
    sender: AuthenticatedUser,
  ): Promise<void> {
    const recipientIds = await this.getOtherParticipantIds(conversationId, sender.id);
    if (recipientIds.length === 0) return;
    const senderRow = await this.prisma.user.findUnique({
      where: { id: sender.id },
      select: { firstName: true, lastName: true },
    });
    const senderName = senderRow
      ? `${senderRow.firstName} ${senderRow.lastName}`.trim()
      : sender.email;
    await Promise.allSettled(
      recipientIds.map((recipientId) =>
        this.fanout.fanoutMessage(tenantId, recipientId, senderName, conversationId),
      ),
    );
  }

  async listMessages(
    conversationId: string,
    query: ListMessagesQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListMessagesResponseDto> {
    await this.assertParticipant(conversationId, user);

    const limit = Math.min(query.limit ?? 50, 100);
    const where: Prisma.MessageWhereInput = { conversationId };

    if (query.before) {
      const cursor = await this.prisma.message.findUnique({
        where: { id: query.before },
        select: { createdAt: true },
      });
      if (cursor) {
        where.createdAt = { lt: cursor.createdAt };
      }
    }

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((m) => this.toMessageResponse(m));
    items.reverse();
    return { items, hasMore };
  }

  async markRead(conversationId: string, user: AuthenticatedUser): Promise<void> {
    await this.assertParticipant(conversationId, user);
    const now = new Date();
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      data: { lastReadAt: now },
    });
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: user.id }, readAt: null },
      data: { readAt: now },
    });
  }

  // ───── Helpers ─────

  async assertParticipant(
    conversationId: string,
    user: AuthenticatedUser,
  ): Promise<{ tenantId: string }> {
    const c = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId: user.tenantId ?? undefined },
      select: { tenantId: true, participants: { select: { userId: true } } },
    });
    if (!c) {
      throw new NotFoundException({ code: 'CONVERSATION_NOT_FOUND' });
    }
    const isParticipant = c.participants.some((p) => p.userId === user.id);
    if (!isParticipant) {
      throw new ForbiddenException({ code: 'NOT_A_PARTICIPANT' });
    }
    return { tenantId: c.tenantId };
  }

  /** Recipients of a real-time event = all participants except the sender. */
  async getOtherParticipantIds(conversationId: string, senderId: string): Promise<string[]> {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: senderId } },
      select: { userId: true },
    });
    return parts.map((p) => p.userId);
  }

  private conversationInclude() {
    return {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
      },
    };
  }

  private toConversationResponse(
    c: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      participants: Array<{
        userId: string;
        lastReadAt: Date | null;
        user: { id: string; firstName: string; lastName: string; email: string };
      }>;
      messages: Array<{ id: string; body: string; senderId: string; createdAt: Date }>;
    },
    currentUserId: string,
  ): ConversationResponseDto {
    const participants: ParticipantSummary[] = c.participants.map((p) => ({
      userId: p.user.id,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      email: p.user.email,
    }));
    const me = c.participants.find((p) => p.userId === currentUserId);
    const lastMessage = c.messages[0];
    let unreadCount = 0;
    if (lastMessage && lastMessage.senderId !== currentUserId) {
      if (!me?.lastReadAt || lastMessage.createdAt > me.lastReadAt) {
        unreadCount = 1;
      }
    }
    return {
      id: c.id,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      participants,
      ...(lastMessage
        ? {
            lastMessage: {
              id: lastMessage.id,
              body: lastMessage.body,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            },
          }
        : {}),
      unreadCount,
    };
  }

  private toMessageResponse(m: {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: Date;
    readAt: Date | null;
  }): MessageResponseDto {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt,
      readAt: m.readAt,
    };
  }
}
