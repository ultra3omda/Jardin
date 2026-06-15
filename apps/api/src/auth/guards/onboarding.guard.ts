import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { ALLOW_DURING_ONBOARDING_KEY } from '../decorators/allow-during-onboarding.decorator';

/** Read-only HTTP verbs never gated — the admin may inspect their (empty) workspace. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Server-side enforcement of the blocking onboarding gate (ADR 0016 §5/7/8).
 *
 * The web and mobile clients already redirect a SCHOOL_ADMIN to the wizard while
 * their org is `PENDING_ONBOARDING`, but a modified client could skip it and
 * mutate tenant data. This guard closes that hole at the API: a SCHOOL_ADMIN
 * cannot perform any write until onboarding is completed.
 *
 * Scope (deliberately narrow to keep the blast radius to the onboarding window
 * of brand-new orgs, and to add at most one PK lookup per admin write):
 *  - Only `SCHOOL_ADMIN` accounts bound to a tenant are gated. Platform roles
 *    (SUPER_ADMIN / COMMERCIAL, tenantId null) and other personas pass — and no
 *    teacher/parent/staff can even exist before onboarding (creating them is
 *    itself a gated write).
 *  - Only mutating verbs are gated; reads always pass.
 *  - Routes the wizard itself needs are allow-listed via {@link AllowDuringOnboarding}
 *    (onboarding completion, branding, auth).
 *
 * Runs after JwtAuthGuard/RolesGuard (req.user is set) and before the
 * TenantContextInterceptor, so it reads the tenant status directly by PK
 * (`Tenant` is not tenant-scoped — no AsyncLocalStorage context required).
 */
@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_DURING_ONBOARDING_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (allowed) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser; method: string }>();
    const user = req.user;

    // Public / unauthenticated routes are not our concern (JwtAuthGuard handles them).
    if (!user) return true;
    // Only school admins with a tenant are gated.
    if (user.role !== UserRole.SCHOOL_ADMIN || !user.tenantId) return true;
    // Reads always pass.
    if (SAFE_METHODS.has(req.method)) return true;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { onboardingCompletedAt: true },
    });
    // Unknown tenant → let the handler deal with it rather than 403 spuriously.
    if (!tenant) return true;

    if (tenant.onboardingCompletedAt === null) {
      throw new ForbiddenException({
        code: 'ONBOARDING_REQUIRED',
        message: "Terminez la configuration de votre établissement avant de continuer.",
      });
    }
    return true;
  }
}
