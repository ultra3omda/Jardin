import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';

import { PrismaService } from '../common/prisma/prisma.service';
import type { RequestMeta } from '../auth/utils/request-meta.utils';

export interface SessionListItem {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns active sessions for the user — newest first.
   * Excludes revoked + expired tokens. The plaintext / hash is NEVER returned.
   */
  async list(userId: string): Promise<SessionListItem[]> {
    const now = new Date();
    const rows = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    }));
  }

  /**
   * Revoke a specific session. Uses updateMany scoped by userId so a user
   * can never revoke another user's session (defense-in-depth on top of
   * the tenant extension).
   */
  async revoke(userId: string, sessionId: string, meta: RequestMeta): Promise<void> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND_OR_ALREADY_REVOKED' });
    }
    await this.writeAudit('users.session_revoked', { userId, metadata: { sessionId }, ...meta });
  }

  private async writeAudit(
    action: string,
    opts: { userId: string; metadata?: object } & RequestMeta,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action,
          resource: 'session',
          tenantId: null,
          userId: opts.userId,
          metadata: (opts.metadata ?? undefined) as object | undefined,
          ip: opts.ip,
          userAgent: opts.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log for action=${action}: ${String(err)}`);
    }
  }
}
