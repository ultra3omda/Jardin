import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { MessagingService } from './messaging.service';

interface AuthedSocket extends Socket {
  data: { user: AuthenticatedUser };
}

/**
 * V3-B — Socket.IO gateway for real-time messaging.
 *
 * Protocol :
 *  - Client connects with `auth: { token: '<access-jwt>' }`
 *  - Each connected user joins a personal room `user:<userId>`
 *  - Outbound events :
 *      • `message:new` payload { conversationId, message } pushed to recipients
 *      • `message:read` payload { conversationId, readerId, readAt }
 *  - Inbound events :
 *      • `message:send` { conversationId, body } → ack with the created MessageResponseDto
 *      • `conversation:read` { conversationId }  → ack { ok: true }
 *
 * CORS is permissive in dev — production should pin `CORS_ORIGIN` via env.
 */
@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly messaging: MessagingService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const authHeader = client.handshake.headers['authorization']?.toString();
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        authHeader?.replace(/^Bearer\s+/i, '');
      if (!token) {
        throw new Error('NO_TOKEN');
      }
      const secret = this.config.get<string>('jwt.accessSecret');
      if (!secret) {
        throw new Error('JWT_SECRET_UNAVAILABLE');
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret });
      if (!payload?.sub) {
        throw new Error('INVALID_PAYLOAD');
      }
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        role: payload.role,
      };
      (client as AuthedSocket).data.user = user;
      await client.join(this.userRoom(user.id));
      this.logger.log(`Socket connected: user=${user.id} tenant=${user.tenantId} sid=${client.id}`);
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'UNKNOWN_ERROR';
      this.logger.warn(`Socket auth failed sid=${client.id} reason=${reason}`);
      client.emit('auth:error', { code: 'AUTH_FAILED', reason });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = (client as AuthedSocket).data?.user;
    this.logger.log(`Socket disconnected: sid=${client.id} user=${user?.id ?? 'anonymous'}`);
  }

  // ───── Inbound ─────

  @SubscribeMessage('message:send')
  async onSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId?: string; body?: string },
  ) {
    const user = client.data.user;
    if (!user) throw new WsException({ code: 'NOT_AUTHENTICATED' });
    if (!data?.conversationId || !data?.body) {
      throw new WsException({ code: 'INVALID_PAYLOAD' });
    }
    if (data.body.length > 2000) {
      throw new WsException({ code: 'MESSAGE_TOO_LONG' });
    }
    const message = await this.messaging.sendMessage(
      { conversationId: data.conversationId, body: data.body },
      user,
    );
    const recipientIds = await this.messaging.getOtherParticipantIds(
      data.conversationId,
      user.id,
    );
    for (const rid of recipientIds) {
      this.server.to(this.userRoom(rid)).emit('message:new', {
        conversationId: data.conversationId,
        message,
      });
    }
    return message;
  }

  @SubscribeMessage('conversation:read')
  async onConversationRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId?: string },
  ) {
    const user = client.data.user;
    if (!user) throw new WsException({ code: 'NOT_AUTHENTICATED' });
    if (!data?.conversationId) throw new WsException({ code: 'INVALID_PAYLOAD' });
    await this.messaging.markRead(data.conversationId, user);
    const others = await this.messaging.getOtherParticipantIds(data.conversationId, user.id);
    const payload = { conversationId: data.conversationId, readerId: user.id, readAt: new Date() };
    for (const rid of others) {
      this.server.to(this.userRoom(rid)).emit('message:read', payload);
    }
    return { ok: true };
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }
}
