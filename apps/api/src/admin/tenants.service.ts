import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { Locale, Prisma, UserRole } from '@prisma/client';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';
import * as bcrypt from 'bcrypt';
import { webcrypto } from 'node:crypto';

import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../common/email/resend.service';
import { InviteEmail } from '../common/email/templates/invite';
import type { RequestMeta } from '../auth/utils/request-meta.utils';
import { InviteTokensService } from './invite-tokens.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import {
  CreateTenantResponseDto,
  InviteSummaryDto,
  TenantSummaryDto,
} from './dto/tenant-response.dto';
import { RESERVED_SLUGS } from './constants/reserved-slugs';

const INVITE_EXPIRES_IN_DAYS = 14;
const PLACEHOLDER_PASSWORD_BYTES = 32;

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inviteTokens: InviteTokensService,
    private readonly resend: ResendService,
    private readonly config: ConfigService,
  ) {}

  async create(
    superAdminId: string,
    dto: CreateTenantDto,
    meta: RequestMeta = {},
  ): Promise<CreateTenantResponseDto> {
    const slug = dto.slug.toLowerCase().trim();
    const adminEmail = dto.adminEmail.trim().toLowerCase();

    if (RESERVED_SLUGS.has(slug)) {
      throw new BadRequestException({
        code: 'SLUG_RESERVED',
        message: `Le slug "${slug}" est réservé.`,
      });
    }

    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_TAKEN',
        message: `Le slug "${slug}" est déjà utilisé.`,
      });
    }

    const brand: TenantBrand | null = dto.primaryColor
      ? { ...DEFAULT_BRAND, primaryColor: dto.primaryColor }
      : null;

    const randomBytes = webcrypto.getRandomValues(new Uint8Array(PLACEHOLDER_PASSWORD_BYTES));
    const placeholderPassword = await bcrypt.hash(
      Buffer.from(randomBytes).toString('hex'),
      this.config.get<number>('bcryptRounds', 12),
    );

    const { tenant } = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          id: createId(),
          name: dto.name.trim(),
          slug,
          type: dto.type,
          locale: dto.locale ?? Locale.fr,
          brand: (brand ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
        },
      });
      await tx.user.create({
        data: {
          id: createId(),
          tenantId: newTenant.id,
          email: adminEmail,
          passwordHash: placeholderPassword,
          firstName: dto.adminFirstName.trim(),
          lastName: dto.adminLastName.trim(),
          role: UserRole.SCHOOL_ADMIN,
          locale: dto.locale ?? Locale.fr,
        },
      });
      return { tenant: newTenant };
    });

    const invite = await this.inviteTokens.create(
      superAdminId,
      {
        invitedEmail: adminEmail,
        intendedRole: UserRole.SCHOOL_ADMIN,
        expiresInDays: INVITE_EXPIRES_IN_DAYS,
      },
      meta,
    );

    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action: 'admin.tenant.created',
          resource: 'tenant',
          tenantId: null,
          userId: superAdminId,
          metadata: { tenantId: tenant.id, slug, adminEmail, inviteTokenId: invite.id },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`audit admin.tenant.created failed: ${String(err)}`);
    }

    let inviteEmailSent = false;
    if (dto.sendInviteEmail !== false) {
      const superAdmin = await this.prisma.user.findUnique({
        where: { id: superAdminId },
        select: { firstName: true, lastName: true },
      });
      const inviterName = superAdmin
        ? `${superAdmin.firstName} ${superAdmin.lastName}`.trim()
        : 'Klasso';
      const result = await this.resend.send({
        to: adminEmail,
        subject: `Bienvenue sur Klasso — administrer ${tenant.name}`,
        template: InviteEmail({
          inviterName,
          registerUrl: invite.url,
          expiresInDays: INVITE_EXPIRES_IN_DAYS,
          brand: brand ?? DEFAULT_BRAND,
          tenantName: tenant.name,
        }),
      });
      inviteEmailSent = result.success;
    }

    return {
      tenant: await this.buildSummary(tenant.id),
      invite: {
        id: invite.id,
        url: invite.url,
        expiresAt: invite.expiresAt,
      } satisfies InviteSummaryDto,
      inviteEmailSent,
    };
  }

  async list(): Promise<TenantSummaryDto[]> {
    const rows = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((t) => this.buildSummary(t.id)));
  }

  async getById(id: string): Promise<TenantSummaryDto> {
    const t = await this.prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!t) throw new NotFoundException({ code: 'TENANT_NOT_FOUND' });
    return this.buildSummary(id);
  }

  async resendInvite(
    tenantId: string,
    superAdminId: string,
    meta: RequestMeta = {},
  ): Promise<InviteSummaryDto> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      include: { users: { where: { role: UserRole.SCHOOL_ADMIN }, take: 1 } },
    });
    if (!tenant) throw new NotFoundException({ code: 'TENANT_NOT_FOUND' });
    const admin = tenant.users[0];
    if (!admin) {
      throw new BadRequestException({ code: 'TENANT_HAS_NO_ADMIN' });
    }
    if (admin.emailVerifiedAt || admin.lastLoginAt) {
      throw new BadRequestException({
        code: 'TENANT_ALREADY_ONBOARDED',
        message: `L'admin de ${tenant.slug} est déjà actif.`,
      });
    }

    const invite = await this.inviteTokens.create(
      superAdminId,
      {
        invitedEmail: admin.email,
        intendedRole: UserRole.SCHOOL_ADMIN,
        expiresInDays: INVITE_EXPIRES_IN_DAYS,
      },
      meta,
    );

    const superAdmin = await this.prisma.user.findUnique({
      where: { id: superAdminId },
      select: { firstName: true, lastName: true },
    });
    const inviterName = superAdmin
      ? `${superAdmin.firstName} ${superAdmin.lastName}`.trim()
      : 'Klasso';

    const brand = (tenant.brand as TenantBrand | null) ?? DEFAULT_BRAND;
    await this.resend.send({
      to: admin.email,
      subject: `Klasso — relance d'invitation pour ${tenant.name}`,
      template: InviteEmail({
        inviterName,
        registerUrl: invite.url,
        expiresInDays: INVITE_EXPIRES_IN_DAYS,
        brand,
        tenantName: tenant.name,
      }),
    });

    return { id: invite.id, url: invite.url, expiresAt: invite.expiresAt };
  }

  private async buildSummary(tenantId: string): Promise<TenantSummaryDto> {
    const t = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const usersCount = await this.prisma.user.count({
      where: { tenantId, deletedAt: null },
    });
    const admin = await this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.SCHOOL_ADMIN, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const adminOnboarded = !!(admin?.emailVerifiedAt || admin?.lastLoginAt);
    const inviteStatus = await this.derivedInviteStatus(admin?.email);

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      type: t.type,
      locale: t.locale,
      brand: t.brand as TenantBrand | null,
      createdAt: t.createdAt.toISOString(),
      usersCount,
      adminOnboarded,
      inviteStatus,
    };
  }

  private async derivedInviteStatus(
    email?: string,
  ): Promise<'pending' | 'consumed' | 'expired' | null> {
    if (!email) return null;
    const latest = await this.prisma.inviteToken.findFirst({
      where: { invitedEmail: email },
      orderBy: { createdAt: 'desc' },
    });
    if (!latest) return null;
    if (latest.consumedAt) return 'consumed';
    if (latest.expiresAt.getTime() < Date.now()) return 'expired';
    return 'pending';
  }
}
