import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { InviteToken, UserRole } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { generateRefreshToken, hashRefreshToken } from '../auth/utils/token.utils';
import type { RequestMeta } from '../auth/utils/request-meta.utils';
import { CreateInviteTokenDto } from './dto/create-invite-token.dto';
import {
  InviteTokenCreatedDto,
  InviteTokenListItemDto,
  InviteTokenStatus,
} from './dto/invite-token-response.dto';

const DEFAULT_EXPIRES_IN_DAYS = 7;
const MS_PER_DAY = 86_400_000;

@Injectable()
export class InviteTokensService {
  private readonly logger = new Logger(InviteTokensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Mint a new invite token. Returns the plaintext ONCE — only its SHA-256
   * hash is persisted. The caller is responsible for transmitting the URL
   * to the invitee out-of-band (V1.5: email — see Group C).
   */
  async create(
    superAdminId: string,
    dto: CreateInviteTokenDto,
    meta: RequestMeta = {},
  ): Promise<InviteTokenCreatedDto> {
    const plaintext = generateRefreshToken();
    const tokenHash = hashRefreshToken(plaintext);
    const expiresInDays = dto.expiresInDays ?? DEFAULT_EXPIRES_IN_DAYS;
    const expiresAt = new Date(Date.now() + expiresInDays * MS_PER_DAY);
    const intendedRole = dto.intendedRole ?? UserRole.SCHOOL_ADMIN;
    const invitedEmail = dto.invitedEmail?.trim().toLowerCase() ?? null;
    const id = createId();

    await this.prisma.inviteToken.create({
      data: {
        id,
        tokenHash,
        invitedEmail,
        intendedRole,
        createdById: superAdminId,
        expiresAt,
      },
    });

    await this.writeAudit('admin.invite_token.mint', {
      userId: superAdminId,
      metadata: { inviteTokenId: id, invitedEmail, intendedRole, expiresAt },
      ...meta,
    });

    const baseUrl = this.config.get<string>(
      'webAppUrl',
      'https://ecole-saas-weld.vercel.app',
    );
    return {
      id,
      token: plaintext,
      url: `${baseUrl}/register?token=${plaintext}`,
      invitedEmail,
      intendedRole,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * List invite tokens with their derived status. Optional `status` filter.
   * Newest first by createdAt. Note: plaintext token is NEVER returned here.
   */
  async list(status?: InviteTokenStatus): Promise<InviteTokenListItemDto[]> {
    const rows = await this.prisma.inviteToken.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const now = Date.now();
    const items = rows.map((row) => this.toListItem(row, now));
    return status ? items.filter((i) => i.status === status) : items;
  }

  /**
   * Revoke an invite token by forcing its expiration to "now". The row is
   * preserved for audit. A revoked token shows up as `expired` in `list()`.
   */
  async revoke(id: string, superAdminId: string, meta: RequestMeta = {}): Promise<void> {
    const existing = await this.prisma.inviteToken.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'INVITE_TOKEN_NOT_FOUND' });
    }
    if (existing.consumedAt) {
      throw new BadRequestException({
        code: 'INVITE_TOKEN_ALREADY_CONSUMED',
        message: 'This invite token has already been consumed and cannot be revoked.',
      });
    }
    await this.prisma.inviteToken.update({
      where: { id },
      data: { expiresAt: new Date() },
    });
    await this.writeAudit('admin.invite_token.revoke', {
      userId: superAdminId,
      metadata: { inviteTokenId: id },
      ...meta,
    });
  }

  /**
   * Validate and atomically consume a token. Throws an explicit code on
   * each failure mode so the caller can surface a clear error to the user.
   *
   * Called by `AuthService.register()` AFTER tenant + user creation, with
   * the freshly-created user's id as `consumingUserId`. Wrap in the same
   * transaction as the user creation to keep things consistent.
   */
  async validateAndConsume(
    plaintext: string,
    consumingUserId: string,
    consumingEmail: string,
    tx?: Pick<PrismaService, 'inviteToken'>,
  ): Promise<InviteToken> {
    const client = tx ?? this.prisma;
    const tokenHash = hashRefreshToken(plaintext);
    const stored = await client.inviteToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new BadRequestException({
        code: 'INVITE_TOKEN_UNKNOWN',
        message: 'This invite token is invalid.',
      });
    }
    if (stored.consumedAt) {
      throw new BadRequestException({
        code: 'INVITE_TOKEN_CONSUMED',
        message: 'This invite token has already been used.',
      });
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'INVITE_TOKEN_EXPIRED',
        message: 'This invite token has expired.',
      });
    }
    if (stored.invitedEmail && stored.invitedEmail !== consumingEmail.trim().toLowerCase()) {
      throw new BadRequestException({
        code: 'INVITE_EMAIL_MISMATCH',
        message: 'This invite was issued for a different email address.',
      });
    }

    const consumed = await client.inviteToken.update({
      where: { id: stored.id },
      data: { consumedAt: new Date(), consumedByUserId: consumingUserId },
    });

    return consumed;
  }

  // ===== Private =====

  private toListItem(row: InviteToken, nowMs: number): InviteTokenListItemDto {
    let status: InviteTokenStatus;
    if (row.consumedAt) {
      status = 'consumed';
    } else if (row.expiresAt.getTime() < nowMs) {
      status = 'expired';
    } else {
      status = 'pending';
    }
    return {
      id: row.id,
      invitedEmail: row.invitedEmail,
      intendedRole: row.intendedRole,
      expiresAt: row.expiresAt.toISOString(),
      consumedAt: row.consumedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      status,
    };
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
          resource: 'invite_token',
          tenantId: null, // super_admin scope is cross-tenant
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
