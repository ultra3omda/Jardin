import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import archiver from 'archiver';
import { createElement } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { R2Service } from '../common/r2/r2.service';
import { ResendService } from '../common/email/resend.service';
import { ExportReadyEmail } from '../common/email/templates/export-ready';
import { PrismaService } from '../common/prisma/prisma.service';
import type { RequestMeta } from '../auth/utils/request-meta.utils';

const SIGNED_URL_TTL_S = 24 * 60 * 60;
const AUDIT_LOG_CAP = 1000;

export interface ExportResult {
  /** Object key under which the archive was uploaded */
  key: string;
  /** Pre-signed download URL (24h validity) */
  downloadUrl: string;
  /** ISO timestamp at which the signed URL expires */
  expiresAt: string;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly r2: R2Service,
    private readonly resend: ResendService,
  ) {}

  /**
   * Build a RGPD-compatible ZIP archive of the user's data, upload it to R2,
   * and email the user a pre-signed download URL. Returns the same URL in
   * the response so the UI can offer an immediate download.
   */
  async exportForUser(userId: string, meta: RequestMeta): Promise<ExportResult> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { tenant: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      locale: user.locale,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
    };

    const tenant = user.tenant
      ? {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          type: user.tenant.type,
          locale: user.tenant.locale,
          timezone: user.tenant.timezone,
          createdAt: user.tenant.createdAt.toISOString(),
        }
      : null;

    const [sessions, auditLogs, verificationTokens, resetTokens, invitesIssued] = await Promise.all([
      this.prisma.refreshToken.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true,
          ip: true,
          userAgent: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: AUDIT_LOG_CAP,
        select: {
          id: true,
          action: true,
          resource: true,
          metadata: true,
          ip: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      this.prisma.emailVerificationToken.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, expiresAt: true, consumedAt: true },
      }),
      this.prisma.passwordResetToken.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          consumedAt: true,
          ip: true,
          userAgent: true,
        },
      }),
      this.prisma.inviteToken.findMany({
        where: { createdById: userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invitedEmail: true,
          intendedRole: true,
          createdAt: true,
          expiresAt: true,
          consumedAt: true,
          consumedByUserId: true,
        },
      }),
    ]);

    const generatedAt = new Date();
    const archive = await this.buildArchive({
      generatedAt,
      profile,
      tenant,
      sessions: sessions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        revokedAt: s.revokedAt?.toISOString() ?? null,
      })),
      auditLogs: auditLogs.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
      verificationTokens: verificationTokens.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        expiresAt: t.expiresAt.toISOString(),
        consumedAt: t.consumedAt?.toISOString() ?? null,
      })),
      resetTokens: resetTokens.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        expiresAt: t.expiresAt.toISOString(),
        consumedAt: t.consumedAt?.toISOString() ?? null,
      })),
      invitesIssued: invitesIssued.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        consumedAt: i.consumedAt?.toISOString() ?? null,
      })),
    });

    const objectKey = `exports/${userId}/${generatedAt.toISOString().replace(/[:.]/g, '-')}-${createId()}.zip`;
    await this.r2.putBuffer(objectKey, archive, 'application/zip');

    const downloadUrl = await this.r2.signedGetUrl(objectKey, SIGNED_URL_TTL_S);
    const expiresAt = new Date(generatedAt.getTime() + SIGNED_URL_TTL_S * 1000);

    // V1.6 — brand the email with the user's tenant theme.
    const storedBrand = (user.tenant?.brand ?? {}) as Partial<TenantBrand>;
    const brand: TenantBrand = { ...DEFAULT_BRAND, ...storedBrand };
    const tenantName = user.tenant?.name;
    const emailResult = await this.resend.send({
      to: user.email,
      subject: `Votre export de données ${tenantName ?? 'École SaaS'} est prêt`,
      template: createElement(ExportReadyEmail, {
        firstName: user.firstName,
        downloadUrl,
        expiresAtIso: expiresAt.toISOString(),
        brand,
        tenantName,
      }),
    });

    await this.writeAudit('users.export_generated', {
      userId,
      tenantId: user.tenantId,
      metadata: {
        objectKey,
        archiveBytes: archive.byteLength,
        emailDelivered: emailResult.success,
      },
      ...meta,
    });

    return {
      key: objectKey,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ===== Private =====

  private async buildArchive(payload: {
    generatedAt: Date;
    profile: object;
    tenant: object | null;
    sessions: object[];
    auditLogs: object[];
    verificationTokens: object[];
    resetTokens: object[];
    invitesIssued: object[];
  }): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('error', (err) => reject(err));
      archive.on('end', () => resolve(Buffer.concat(chunks)));

      archive.append(JSON.stringify(payload.profile, null, 2), { name: 'profile.json' });
      if (payload.tenant) {
        archive.append(JSON.stringify(payload.tenant, null, 2), { name: 'tenant.json' });
      }
      archive.append(JSON.stringify(payload.sessions, null, 2), { name: 'sessions.json' });
      archive.append(JSON.stringify(payload.auditLogs, null, 2), { name: 'audit-logs.json' });
      archive.append(JSON.stringify(payload.verificationTokens, null, 2), {
        name: 'email-verification-tokens.json',
      });
      archive.append(JSON.stringify(payload.resetTokens, null, 2), {
        name: 'password-reset-tokens.json',
      });
      if (payload.invitesIssued.length > 0) {
        archive.append(JSON.stringify(payload.invitesIssued, null, 2), {
          name: 'invites-issued.json',
        });
      }
      archive.append(this.buildReadme(payload.generatedAt), { name: 'README.txt' });

      void archive.finalize();
    });
  }

  private buildReadme(generatedAt: Date): string {
    return [
      'École SaaS — Export de vos données personnelles (RGPD)',
      '========================================================',
      '',
      `Date de génération : ${generatedAt.toISOString()}`,
      '',
      "Ce dossier contient l'intégralité des données stockées par École SaaS vous concernant.",
      'Les secrets (hash de mot de passe, hash de tokens) ne sont volontairement PAS inclus.',
      '',
      'Fichiers :',
      '  - profile.json                   Votre fiche utilisateur',
      '  - tenant.json                    Établissement (si applicable)',
      '  - sessions.json                  Historique de vos sessions',
      '  - audit-logs.json                Journal de vos actions (1000 dernières)',
      '  - email-verification-tokens.json Historique des vérifications email',
      '  - password-reset-tokens.json     Historique des réinitialisations',
      '  - invites-issued.json            (super_admin) Invitations émises',
      '',
      'Pour exercer un autre droit RGPD (rectification, effacement, opposition), contactez-nous.',
      '',
    ].join('\n');
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
