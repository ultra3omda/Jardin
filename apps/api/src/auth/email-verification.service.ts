import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { User } from '@prisma/client';
import { createElement } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { ResendService } from '../common/email/resend.service';
import { VerifyEmail } from '../common/email/templates/verify-email';
import { PrismaService } from '../common/prisma/prisma.service';
import type { RequestMeta } from './utils/request-meta.utils';
import { generateRefreshToken, hashRefreshToken } from './utils/token.utils';

const VERIFICATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly resend: ResendService,
  ) {}

  /**
   * Mint a 48h verification token, persist its hash, and send the email.
   * Best-effort on the email — failure is logged but does NOT throw, since
   * blocking register/resend on email-provider hiccups would be worse UX.
   */
  async mintAndSend(
    user: Pick<User, 'id' | 'email' | 'firstName'>,
    meta: RequestMeta = {},
  ): Promise<void> {
    if (await this.isAlreadyVerified(user.id)) {
      return;
    }

    const plaintext = generateRefreshToken();
    const tokenHash = hashRefreshToken(plaintext);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await this.prisma.emailVerificationToken.create({
      data: {
        id: createId(),
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl = this.config.get<string>('webAppUrl', 'https://ecole-saas-weld.vercel.app');
    // V1.6 — pre-auth deep link routes through /t/[slug]/verify-email so the
    // landing page is branded with the tenant theme. Fallback to generic
    // /verify-email if the user has no tenantSlug (legacy super_admin).
    const { brand, tenantName, tenantSlug } = await this.loadBrandForUser(user.id);
    const verifyUrl = tenantSlug
      ? `${baseUrl}/t/${tenantSlug}/verify-email?token=${plaintext}`
      : `${baseUrl}/verify-email?token=${plaintext}`;

    const result = await this.resend.send({
      to: user.email,
      subject: `Confirmez votre adresse email — ${tenantName ?? 'École SaaS'}`,
      template: createElement(VerifyEmail, {
        firstName: user.firstName,
        verifyUrl,
        brand,
        tenantName,
      }),
    });

    await this.writeAudit('auth.email.verification_sent', {
      userId: user.id,
      metadata: { delivered: result.success, providerId: result.id, error: result.error },
      ...meta,
    });

    if (!result.success) {
      this.logger.warn(
        `Verification email could not be sent to userId=${user.id}: ${result.error ?? 'unknown'}`,
      );
    }
  }

  /**
   * Validate the token and mark the user's email as verified. Atomic via tx
   * so a partial consume cannot occur.
   */
  async consume(plaintext: string, meta: RequestMeta = {}): Promise<{ userId: string }> {
    const tokenHash = hashRefreshToken(plaintext);
    const stored = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new BadRequestException({
        code: 'EMAIL_VERIFICATION_TOKEN_UNKNOWN',
        message: 'Ce lien de vérification est invalide.',
      });
    }
    if (stored.consumedAt) {
      throw new BadRequestException({
        code: 'EMAIL_VERIFICATION_TOKEN_CONSUMED',
        message: 'Ce lien de vérification a déjà été utilisé.',
      });
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'EMAIL_VERIFICATION_TOKEN_EXPIRED',
        message: 'Ce lien de vérification a expiré. Demandez-en un nouveau.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: stored.id },
        data: { consumedAt: new Date() },
      });
      if (!stored.user.emailVerifiedAt) {
        await tx.user.update({
          where: { id: stored.userId },
          data: { emailVerifiedAt: new Date() },
        });
      }
    });

    await this.writeAudit('auth.email.verified', {
      userId: stored.userId,
      tenantId: stored.user.tenantId,
      ...meta,
    });

    return { userId: stored.userId };
  }

  // ===== Private =====

  private async isAlreadyVerified(userId: string): Promise<boolean> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });
    return !!u?.emailVerifiedAt;
  }

  /**
   * V1.6 — Load the user's tenant brand + name + slug for email templating.
   * Returns DEFAULT_BRAND with undefined name/slug if the user has no tenant
   * (super_admin) or the tenant has no stored brand.
   */
  private async loadBrandForUser(userId: string): Promise<{
    brand: TenantBrand;
    tenantName?: string;
    tenantSlug?: string;
  }> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenant: { select: { name: true, slug: true, brand: true } } },
    });
    if (!u?.tenant) return { brand: DEFAULT_BRAND };
    const stored = (u.tenant.brand ?? {}) as Partial<TenantBrand>;
    return {
      brand: { ...DEFAULT_BRAND, ...stored },
      tenantName: u.tenant.name,
      tenantSlug: u.tenant.slug,
    };
  }

  private async writeAudit(
    action: string,
    opts: { userId: string; tenantId?: string | null; metadata?: object } & RequestMeta,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action,
          resource: 'auth',
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
