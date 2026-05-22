import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { Tenant, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../common/prisma/prisma.service';
import type { RequestMeta } from '../auth/utils/request-meta.utils';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Reads the authenticated user's profile (with tenant). */
  async findMe(userId: string): Promise<{ user: User; tenant: Tenant | null }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { tenant: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { tenant, ...rest } = user;
    return { user: rest as User, tenant };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, meta: RequestMeta): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
      },
    });

    await this.writeAudit('users.profile_updated', {
      userId,
      tenantId: existing.tenantId,
      metadata: { updatedFields: Object.keys(dto) },
      ...meta,
    });

    return updated;
  }

  /**
   * Changes the user's password after re-authenticating via currentPassword.
   * On success, revokes ALL active refresh tokens for the user — every
   * existing session (including the current one) must log in again.
   */
  async changePassword(userId: string, dto: ChangePasswordDto, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      await this.writeAudit('users.password_change_failed', {
        userId,
        tenantId: user.tenantId,
        metadata: { reason: 'bad-current-password' },
        ...meta,
      });
      throw new UnauthorizedException({
        code: 'CURRENT_PASSWORD_INVALID',
        message: 'Le mot de passe actuel est incorrect.',
      });
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({
        code: 'NEW_PASSWORD_SAME_AS_CURRENT',
        message: "Le nouveau mot de passe doit être différent de l'actuel.",
      });
    }

    const rounds = this.config.get<number>('bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.newPassword, rounds);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: now },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    await this.writeAudit('users.password_changed', {
      userId,
      tenantId: user.tenantId,
      ...meta,
    });

    this.logger.log(`Password changed for userId=${userId} — all sessions revoked`);
  }

  /**
   * Soft-delete the account. Sets `deletedAt` + revokes all active sessions.
   * The user record is preserved for audit / RGPD obligations.
   */
  async softDelete(userId: string, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: now },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    await this.writeAudit('users.soft_deleted', {
      userId,
      tenantId: user.tenantId,
      ...meta,
    });

    this.logger.log(`User soft-deleted: userId=${userId}`);
  }

  // ===== Private =====

  private async writeAudit(
    action: string,
    opts: { userId: string; tenantId?: string | null; metadata?: object } & RequestMeta,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action,
          resource: 'user',
          tenantId: opts.tenantId ?? null,
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
