import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcrypt';
import { createElement } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { ResendService } from '../common/email/resend.service';
import { ResetPasswordEmail } from '../common/email/templates/reset-password';
import { PrismaService } from '../common/prisma/prisma.service';
import type { RequestMeta } from './utils/request-meta.utils';
import { generateRefreshToken, hashRefreshToken } from './utils/token.utils';

const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly resend: ResendService,
  ) {}

  /**
   * Best-effort password-reset email. ALWAYS resolves successfully (no
   * exceptions thrown) — anti-enumeration: an attacker probing emails
   * cannot distinguish "user exists" from "user does not exist".
   *
   * If the same email exists under multiple tenants, sends one mail per
   * matched account (each with its own scoped token). Caller can pass
   * `tenantSlug` to pin to a single tenant.
   */
  async forgot(
    email: string,
    tenantSlug: string | undefined,
    meta: RequestMeta = {},
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const users = await this.prisma.user.findMany({
      where: {
        email: normalizedEmail,
        deletedAt: null,
        ...(tenantSlug ? { tenant: { slug: tenantSlug.toLowerCase() } } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        tenantId: true,
        tenant: { select: { name: true, slug: true, brand: true } },
      },
    });

    await this.writeAudit('auth.password.forgot', {
      metadata: { email: normalizedEmail, matchCount: users.length, tenantSlug },
      ...meta,
    });

    if (users.length === 0) {
      this.logger.log(`Password-forgot: no user matched email=${normalizedEmail}`);
      return;
    }

    const baseUrl = this.config.get<string>('webAppUrl', 'https://klasso.tn');

    await Promise.all(
      users.map(async (u) => {
        const plaintext = generateRefreshToken();
        const tokenHash = hashRefreshToken(plaintext);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

        await this.prisma.passwordResetToken.create({
          data: {
            id: createId(),
            userId: u.id,
            tokenHash,
            expiresAt,
            ip: meta.ip,
            userAgent: meta.userAgent,
          },
        });

        // V1.6 — pre-auth deep link through /t/[slug]/reset-password so the
        // landing page is branded. Fall back to generic /reset-password for
        // users without tenantSlug (super_admin).
        const slug = u.tenant?.slug;
        const resetUrl = slug
          ? `${baseUrl}/t/${slug}/reset-password?token=${plaintext}`
          : `${baseUrl}/reset-password?token=${plaintext}`;
        const storedBrand = (u.tenant?.brand ?? {}) as Partial<TenantBrand>;
        const brand: TenantBrand = { ...DEFAULT_BRAND, ...storedBrand };
        const tenantName = u.tenant?.name;
        const result = await this.resend.send({
          to: u.email,
          subject: `Réinitialisation de votre mot de passe — ${tenantName ?? 'École SaaS'}`,
          template: createElement(ResetPasswordEmail, {
            firstName: u.firstName,
            resetUrl,
            brand,
            tenantName,
          }),
        });

        if (!result.success) {
          this.logger.warn(
            `Reset email could not be sent to userId=${u.id}: ${result.error ?? 'unknown'}`,
          );
        }
      }),
    );
  }

  /**
   * Validate the token, then atomically: mark the token consumed, set the
   * new bcrypt-hashed password + passwordChangedAt timestamp, and revoke
   * ALL active refresh tokens for that user. The change-of-password forces
   * every existing session to require a fresh login.
   */
  async reset(
    plaintext: string,
    newPassword: string,
    meta: RequestMeta = {},
  ): Promise<{ userId: string }> {
    const tokenHash = hashRefreshToken(plaintext);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new BadRequestException({
        code: 'PASSWORD_RESET_TOKEN_UNKNOWN',
        message: 'Ce lien de réinitialisation est invalide.',
      });
    }
    if (stored.consumedAt) {
      throw new BadRequestException({
        code: 'PASSWORD_RESET_TOKEN_CONSUMED',
        message: 'Ce lien de réinitialisation a déjà été utilisé.',
      });
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'PASSWORD_RESET_TOKEN_EXPIRED',
        message: 'Ce lien de réinitialisation a expiré. Demandez-en un nouveau.',
      });
    }

    const rounds = this.config.get<number>('bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(newPassword, rounds);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: stored.id },
        data: { consumedAt: now },
      });
      await tx.user.update({
        where: { id: stored.userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    await this.writeAudit('auth.password.reset', {
      userId: stored.userId,
      tenantId: stored.user.tenantId,
      ...meta,
    });

    this.logger.log(
      `Password reset for userId=${stored.userId} — all active sessions revoked`,
    );
    return { userId: stored.userId };
  }

  // ===== Private =====

  private async writeAudit(
    action: string,
    opts: { userId?: string; tenantId?: string | null; metadata?: object } & RequestMeta,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action,
          resource: 'auth',
          tenantId: opts.tenantId ?? null,
          userId: opts.userId ?? null,
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
