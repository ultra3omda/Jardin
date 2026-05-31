import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { Contract, Locale, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { RESERVED_SLUGS } from '../admin/constants/reserved-slugs';
import { InviteSummaryDto } from '../admin/dto/tenant-response.dto';
import { InviteTokensService } from '../admin/invite-tokens.service';
import type { RequestMeta } from '../auth/utils/request-meta.utils';
import { ResendService } from '../common/email/resend.service';
import { InviteEmail } from '../common/email/templates/invite';
import { PrismaService } from '../common/prisma/prisma.service';
import { R2Service } from '../common/r2/r2.service';
import {
  CommercialAgentDto,
  ContractSummaryDto,
  CreateOrganizationResponseDto,
  OrganizationSummaryDto,
} from './dto/commercial-response.dto';
import { CreateCommercialAgentDto } from './dto/create-commercial-agent.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

const INVITE_EXPIRES_IN_DAYS = 14;
const CONTRACT_UPLOAD_TTL_S = 300;
const CONTRACT_DOWNLOAD_TTL_S = 600;

/**
 * GTM — Commercial back-office. A COMMERCIAL (or SUPER_ADMIN) attaches a signed
 * contract and creates the organization they closed; the future SCHOOL_ADMIN is
 * then invited by email to create their account and personalize the app.
 *
 * Uses the RAW {@link PrismaService} on purpose: COMMERCIAL is a platform role
 * with `tenantId = null`, blocked by the tenant-isolation extension from every
 * tenant-scoped model. The entities touched here (Tenant, Contract, InviteToken,
 * User-for-agents) are not tenant-filtered, so the raw client is the right tool.
 */
@Injectable()
export class CommercialService {
  private readonly logger = new Logger(CommercialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inviteTokens: InviteTokensService,
    private readonly resend: ResendService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {}

  /** Presigned PUT URL so the browser uploads the signed PDF directly to R2. */
  async createContractUploadUrl(
    fileName: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const fileKey = `contracts/${createId()}.pdf`;
    const uploadUrl = await this.r2.signedPutUrl(fileKey, contentType, CONTRACT_UPLOAD_TTL_S);
    this.logger.log(`Contract upload URL minted key=${fileKey} (${fileName})`);
    return { uploadUrl, fileKey };
  }

  /**
   * Create the signed organization: tenant (PENDING_ONBOARDING) + contract +
   * an invite bound to that tenant, then email the admin. No placeholder user
   * is created — the SCHOOL_ADMIN account is provisioned at /register time.
   */
  async createOrganization(
    actorId: string,
    dto: CreateOrganizationDto,
    meta: RequestMeta = {},
  ): Promise<CreateOrganizationResponseDto> {
    const slug = dto.slug.toLowerCase().trim();
    const adminEmail = dto.adminEmail.trim().toLowerCase();

    if (RESERVED_SLUGS.has(slug)) {
      throw new BadRequestException({ code: 'SLUG_RESERVED', message: `Le slug "${slug}" est réservé.` });
    }
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException({ code: 'SLUG_TAKEN', message: `Le slug "${slug}" est déjà utilisé.` });
    }

    const { tenant, contract } = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          id: createId(),
          name: dto.name.trim(),
          slug,
          type: dto.type,
          locale: dto.locale ?? Locale.fr,
          // status defaults to PENDING_ONBOARDING — the admin must run the wizard.
        },
      });
      const newContract = await tx.contract.create({
        data: {
          id: createId(),
          tenantId: newTenant.id,
          reference: dto.contract.reference?.trim() || null,
          fileKey: dto.contract.fileKey,
          fileName: dto.contract.fileName,
          signedAt: new Date(dto.contract.signedAt),
          startDate: new Date(dto.contract.startDate),
          endDate: dto.contract.endDate ? new Date(dto.contract.endDate) : null,
          notes: dto.contract.notes?.trim() || null,
          createdById: actorId,
        },
      });
      return { tenant: newTenant, contract: newContract };
    });

    // Invite bound to the freshly created tenant → /register attaches the admin
    // to it instead of creating a brand-new organization.
    const invite = await this.inviteTokens.create(
      actorId,
      {
        invitedEmail: adminEmail,
        intendedRole: UserRole.SCHOOL_ADMIN,
        expiresInDays: INVITE_EXPIRES_IN_DAYS,
      },
      meta,
      tenant.id,
    );

    await this.writeAudit(
      'commercial.organization.created',
      actorId,
      { tenantId: tenant.id, slug, adminEmail, contractId: contract.id, inviteTokenId: invite.id },
      meta,
    );

    let inviteEmailSent = false;
    if (dto.sendInviteEmail !== false) {
      const actor = await this.prisma.user.findUnique({
        where: { id: actorId },
        select: { firstName: true, lastName: true },
      });
      const inviterName = actor ? `${actor.firstName} ${actor.lastName}`.trim() : 'Klasso';
      const result = await this.resend.send({
        to: adminEmail,
        subject: `Bienvenue sur Klasso — administrer ${tenant.name}`,
        template: InviteEmail({
          inviterName,
          registerUrl: invite.url,
          expiresInDays: INVITE_EXPIRES_IN_DAYS,
          tenantName: tenant.name,
        }),
      });
      inviteEmailSent = result.success;
    }

    return {
      organization: await this.buildSummary(tenant.id),
      contract: this.contractToDto(contract),
      invite: { id: invite.id, url: invite.url, expiresAt: invite.expiresAt } satisfies InviteSummaryDto,
      inviteEmailSent,
    };
  }

  /**
   * List organizations. SUPER_ADMIN sees all; a COMMERCIAL sees only the ones
   * they closed (i.e. tenants holding a contract they created).
   */
  async listOrganizations(actorId: string, role: UserRole): Promise<OrganizationSummaryDto[]> {
    const where =
      role === UserRole.SUPER_ADMIN
        ? { deletedAt: null }
        : { deletedAt: null, contracts: { some: { createdById: actorId } } };
    const tenants = await this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(tenants.map((t) => this.buildSummary(t.id)));
  }

  async getOrganization(
    id: string,
    actorId: string,
    role: UserRole,
  ): Promise<OrganizationSummaryDto> {
    await this.assertOrgVisible(id, actorId, role);
    return this.buildSummary(id);
  }

  /** Signed GET URL to download the latest contract PDF for an organization. */
  async getContractDownloadUrl(
    tenantId: string,
    actorId: string,
    role: UserRole,
  ): Promise<{ url: string; fileName: string }> {
    await this.assertOrgVisible(tenantId, actorId, role);
    const contract = await this.prisma.contract.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (!contract) throw new NotFoundException({ code: 'CONTRACT_NOT_FOUND' });
    const url = await this.r2.signedGetUrl(contract.fileKey, CONTRACT_DOWNLOAD_TTL_S);
    return { url, fileName: contract.fileName };
  }

  // ===== Commercial agents (SUPER_ADMIN only) =====

  async createAgent(
    superAdminId: string,
    dto: CreateCommercialAgentDto,
    meta: RequestMeta = {},
  ): Promise<CommercialAgentDto> {
    const email = dto.email.trim().toLowerCase();
    // Platform users (tenantId null) are unique by email across the platform.
    const existing = await this.prisma.user.findFirst({ where: { tenantId: null, email } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Cet email est déjà utilisé.' });
    }
    const rounds = this.config.get<number>('bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const user = await this.prisma.user.create({
      data: {
        id: createId(),
        tenantId: null,
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: UserRole.COMMERCIAL,
        locale: dto.locale ?? Locale.fr,
        emailVerifiedAt: new Date(), // vetted by the super-admin → no email round-trip
      },
    });
    await this.writeAudit('commercial.agent.created', superAdminId, { commercialId: user.id, email }, meta);
    return this.agentToDto(user);
  }

  async listAgents(): Promise<CommercialAgentDto[]> {
    const agents = await this.prisma.user.findMany({
      where: { role: UserRole.COMMERCIAL, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return agents.map((a) => this.agentToDto(a));
  }

  // ===== Private =====

  private async assertOrgVisible(id: string, actorId: string, role: UserRole): Promise<void> {
    const tenant = await this.prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!tenant) throw new NotFoundException({ code: 'ORGANIZATION_NOT_FOUND' });
    if (role === UserRole.SUPER_ADMIN) return;
    const owned = await this.prisma.contract.findFirst({
      where: { tenantId: id, createdById: actorId },
    });
    if (!owned) {
      throw new ForbiddenException({ code: 'ORGANIZATION_NOT_OWNED' });
    }
  }

  private async buildSummary(tenantId: string): Promise<OrganizationSummaryDto> {
    const t = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const contractsCount = await this.prisma.contract.count({ where: { tenantId } });
    const inviteStatus = await this.derivedInviteStatus(tenantId);
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      type: t.type,
      locale: t.locale,
      status: t.status,
      onboardingCompleted: t.onboardingCompletedAt !== null,
      createdAt: t.createdAt.toISOString(),
      inviteStatus,
      contractsCount,
    };
  }

  private async derivedInviteStatus(
    tenantId: string,
  ): Promise<'pending' | 'consumed' | 'expired' | null> {
    const latest = await this.prisma.inviteToken.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (!latest) return null;
    if (latest.consumedAt) return 'consumed';
    if (latest.expiresAt.getTime() < Date.now()) return 'expired';
    return 'pending';
  }

  private contractToDto(c: Contract): ContractSummaryDto {
    return {
      id: c.id,
      reference: c.reference,
      fileName: c.fileName,
      signedAt: c.signedAt.toISOString(),
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString() ?? null,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    };
  }

  private agentToDto(u: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
    lastLoginAt: Date | null;
  }): CommercialAgentDto {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    };
  }

  private async writeAudit(
    action: string,
    userId: string,
    metadata: object,
    meta: RequestMeta = {},
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action,
          resource: 'commercial',
          tenantId: null,
          userId,
          metadata: metadata as object,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`audit ${action} failed: ${String(err)}`);
    }
  }
}
