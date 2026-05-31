import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { TenantStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { TenantBrandService } from '../tenant-brand/tenant-brand.service';
import { CompleteOnboardingDto, OnboardingStatusDto } from './dto/complete-onboarding.dto';

/**
 * GTM — Blocking onboarding. After a SCHOOL_ADMIN creates their account, the
 * web force-redirects them here until they confirm their organization name and
 * (optionally) pick colors + logo. Completing the wizard flips the tenant from
 * PENDING_ONBOARDING to ACTIVE and stamps `onboardingCompletedAt`.
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly brand: TenantBrandService,
  ) {}

  async status(): Promise<OnboardingStatusDto> {
    const tenantId = this.requireTenantId();
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw new NotFoundException({ code: 'TENANT_NOT_FOUND' });
    const brand = await this.brand.findByTenant(tenantId);
    return {
      completed: tenant.onboardingCompletedAt !== null,
      organization: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        locale: tenant.locale,
        status: tenant.status,
      },
      brand,
    };
  }

  async complete(dto: CompleteOnboardingDto): Promise<OnboardingStatusDto> {
    const tenantId = this.requireTenantId();
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw new NotFoundException({ code: 'TENANT_NOT_FOUND' });

    // Persist branding first (TenantBrandService enforces the anti-SSRF logo check).
    if (dto.brand && Object.keys(dto.brand).length > 0) {
      await this.brand.update(tenantId, dto.brand);
    }

    // Confirm the name + flip the lifecycle. Idempotent: re-completing only
    // refreshes the name/brand and keeps the original onboarding timestamp.
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name.trim(),
        status: TenantStatus.ACTIVE,
        onboardingCompletedAt: tenant.onboardingCompletedAt ?? new Date(),
      },
    });

    await this.writeAudit('onboarding.completed', tenantId);
    this.logger.log(`onboarding.completed tenantId=${tenantId}`);
    return this.status();
  }

  // ===== Private =====

  private requireTenantId(): string {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      // SUPER_ADMIN / COMMERCIAL (tenantId null) have no organization to onboard.
      throw new ForbiddenException({
        code: 'NO_TENANT_CONTEXT',
        message: "Aucune organisation associée à ce compte.",
      });
    }
    return tenantId;
  }

  private async writeAudit(action: string, tenantId: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action,
          resource: 'onboarding',
          tenantId,
          userId: this.tenantContext.get()?.userId ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`audit ${action} failed: ${String(err)}`);
    }
  }
}
