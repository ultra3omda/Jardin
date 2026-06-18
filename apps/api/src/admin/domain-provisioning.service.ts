import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { DomainStatus, UserRole } from '@prisma/client';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../common/email/resend.service';
import { InviteEmail } from '../common/email/templates/invite';
import { DNS_PROVIDER, type DnsProvider } from '../dns/dns-provider.interface';
import { VercelDomainsClient } from '../dns/vercel-domains.client';
import { InviteTokensService } from './invite-tokens.service';

const INVITE_EXPIRES_IN_DAYS = 14;
const MAX_LOG_ERROR_LEN = 200;
const MAX_DOMAIN_ERROR_LEN = 500;

/** Shape of the tenant data needed by the provisioning helpers. */
interface TenantSnapshot {
  id: string;
  slug: string;
  name: string;
  brand: unknown;
}

/** Shape of the admin user data needed to send the invite email. */
interface AdminSnapshot {
  email: string;
}

@Injectable()
export class DomainProvisioningService {
  private readonly logger = new Logger(DomainProvisioningService.name);

  constructor(
    @Inject(DNS_PROVIDER) private readonly dns: DnsProvider,
    private readonly vercel: VercelDomainsClient,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly resend: ResendService,
    private readonly invites: InviteTokensService,
  ) {}

  isEnabled(): boolean {
    return this.config.get<boolean>('domainAutomation.enabled', false);
  }

  /**
   * Full provisioning flow: OVH CNAME → Vercel domain → poll SSL → email.
   * Never throws — all failures are captured into domainStatus = FAILED.
   */
  async provision(tenantId: string, superAdminId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });
    if (!tenant) return;

    const baseDomain = this.config.get<string>('domainAutomation.baseDomain', 'klasso.tn');
    const cnameTarget = this.config.get<string>('domainAutomation.cnameTarget', 'cname.vercel-dns.com.');
    const fqdn = `${tenant.slug}.${baseDomain}`;

    try {
      await this.dns.upsertCname(tenant.slug, cnameTarget);
      await this.vercel.addDomain(fqdn);
      const ready = await this.pollReady(fqdn);
      // Funnel timeout through the single catch-based fail() path.
      if (!ready) throw new Error('Domain not verified before timeout');

      await this.markActive(tenantId, fqdn);
      await this.audit('admin.tenant.domain_provisioned', superAdminId, { tenantId, fqdn });
      // Post-ACTIVE invite failure must NOT revert the domain to FAILED.
      await this.trySendInvite(tenant, tenantId, superAdminId, `https://${fqdn}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.fail(tenantId, superAdminId, tenant, message);
    }
  }

  /** Remove Vercel domain + OVH CNAME, reset domainStatus to NONE. */
  async deprovision(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) return;
    const baseDomain = this.config.get<string>('domainAutomation.baseDomain', 'klasso.tn');
    try {
      await this.vercel.removeDomain(`${tenant.slug}.${baseDomain}`);
      await this.dns.deleteCname(tenant.slug);
    } finally {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          domainStatus: DomainStatus.NONE,
          customDomain: null,
          domainError: null,
          domainProvisionedAt: null,
        },
      });
    }
  }

  /**
   * Boot reconciliation: re-arm polling for tenants left in PROVISIONING
   * (e.g. after a crash or restart mid-poll).
   */
  async reconcilePending(): Promise<void> {
    if (!this.isEnabled()) return;
    const pending = await this.prisma.tenant.findMany({
      where: { domainStatus: DomainStatus.PROVISIONING, deletedAt: null },
    });
    if (!pending.length) return;
    const superAdmin = await this.prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN, deletedAt: null },
    });
    if (!superAdmin) return;
    for (const t of pending) {
      void this.provision(t.id, superAdmin.id);
    }
  }

  // ===== Private helpers =====

  private async pollReady(fqdn: string): Promise<boolean> {
    const intervalMs = this.config.get<number>('domainAutomation.pollIntervalMs', 10_000);
    const maxAttempts = this.config.get<number>('domainAutomation.pollMaxAttempts', 180);
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.vercel.isReady(fqdn)) return true;
      if (intervalMs > 0) await new Promise<void>((r) => setTimeout(r, intervalMs));
    }
    return false;
  }

  /** Set domain to ACTIVE in DB — called only from the success path. */
  private async markActive(tenantId: string, fqdn: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        domainStatus: DomainStatus.ACTIVE,
        customDomain: fqdn,
        domainError: null,
        domainProvisionedAt: new Date(),
      },
    });
  }

  /**
   * Send the subdomain invite after ACTIVE is persisted.
   * Swallows all errors — an invite-send failure must NOT revert the domain to FAILED.
   */
  private async trySendInvite(
    tenant: TenantSnapshot,
    tenantId: string,
    superAdminId: string,
    baseUrlOverride: string,
  ): Promise<void> {
    try {
      await this.sendInvite(tenant, tenantId, superAdminId, baseUrlOverride);
    } catch (err) {
      this.logger.error(
        `Invite send failed after ACTIVE for tenant ${tenant.slug} (domain stays ACTIVE): ${String(err).slice(0, MAX_LOG_ERROR_LEN)}`,
      );
    }
  }

  /**
   * Persist FAILED state and send a path-based fallback invite so the tenant
   * is never blocked waiting on a broken domain.
   * Never throws — all errors are caught and logged.
   */
  private async fail(
    tenantId: string,
    superAdminId: string,
    tenant: TenantSnapshot,
    message: string,
  ): Promise<void> {
    const safeLog = message.slice(0, MAX_LOG_ERROR_LEN);
    const safeError = message.slice(0, MAX_DOMAIN_ERROR_LEN);
    this.logger.error(`Domain provisioning failed for tenant ${tenant.slug}: ${safeLog}`);
    try {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { domainStatus: DomainStatus.FAILED, domainError: safeError },
      });
    } catch (dbErr) {
      this.logger.error(`fail(): prisma update threw for tenant ${tenant.slug}: ${String(dbErr).slice(0, MAX_LOG_ERROR_LEN)}`);
    }
    try {
      // 5th arg undefined → path-based fallback (invites.create uses webAppUrl default).
      await this.sendInvite(tenant, tenantId, superAdminId, undefined);
    } catch (inviteErr) {
      this.logger.error(`fail(): fallback sendInvite threw for tenant ${tenant.slug}: ${String(inviteErr).slice(0, MAX_LOG_ERROR_LEN)}`);
    }
    await this.audit('admin.tenant.domain_failed', superAdminId, { tenantId });
  }

  /**
   * Mint a fresh invite and email it to the tenant's SCHOOL_ADMIN.
   * Threading tenantId directly avoids a redundant DB query (plan note §9).
   * baseUrlOverride = subdomain URL on ACTIVE, undefined on FAILED (path-based fallback).
   */
  private async sendInvite(
    tenant: TenantSnapshot,
    tenantId: string,
    superAdminId: string,
    baseUrlOverride: string | undefined,
  ): Promise<void> {
    const admin = await this.findTenantAdmin(tenantId);
    if (!admin) return;

    const invite = await this.invites.create(
      superAdminId,
      {
        invitedEmail: admin.email,
        intendedRole: UserRole.SCHOOL_ADMIN,
        expiresInDays: INVITE_EXPIRES_IN_DAYS,
      },
      {},
      tenantId,
      baseUrlOverride,
    );

    const brand = (tenant.brand as TenantBrand | null) ?? DEFAULT_BRAND;
    await this.resend.send({
      to: admin.email,
      subject: `Bienvenue sur Klasso — administrer ${tenant.name}`,
      template: InviteEmail({
        inviterName: 'Klasso',
        registerUrl: invite.url,
        expiresInDays: INVITE_EXPIRES_IN_DAYS,
        brand,
        tenantName: tenant.name,
      }),
    });
  }

  private async findTenantAdmin(tenantId: string): Promise<AdminSnapshot | null> {
    return this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.SCHOOL_ADMIN, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { email: true },
    });
  }

  private async audit(
    action: string,
    userId: string,
    metadata: object,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: { id: createId(), action, resource: 'tenant', tenantId: null, userId, metadata },
      });
    } catch (err) {
      this.logger.error(`audit ${action} failed: ${String(err)}`);
    }
  }
}
