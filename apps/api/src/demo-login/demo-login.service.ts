import { randomBytes } from 'node:crypto';

import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Locale, Tenant, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { DEMO_PERSONA_MAP } from './demo-login.constants';
import {
  DEMO_ROLE_MAP,
  DEMO_TENANT_MAP,
  DEMO_USER_NAMES,
} from './demo-login.tenants';
import type { DemoPersona } from './dto/demo-login.dto';

type DemoUserWithTenant = User & { tenant: Tenant | null };

@Injectable()
export class DemoLoginService {
  private readonly logger = new Logger(DemoLoginService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async demoLogin(persona: DemoPersona, ip: string | null) {
    if (process.env.DEMO_ACCOUNTS_ENABLED === 'false') {
      throw new ForbiddenException({ code: 'DEMO_ACCOUNTS_DISABLED' });
    }

    const config = DEMO_PERSONA_MAP[persona];
    if (!config) {
      throw new NotFoundException({ code: 'UNKNOWN_PERSONA' });
    }

    let seeded = false;
    let user = (await this.prisma.user.findFirst({
      where: {
        email: config.email.toLowerCase(),
        tenant: config.tenantSlug ? { slug: config.tenantSlug } : null,
        deletedAt: null,
      },
      include: { tenant: true },
    })) as DemoUserWithTenant | null;

    // V7-C — Self-healing: if the demo user does not exist (e.g. prod DB never
    // received `pnpm prisma db seed`), upsert tenant + user on the fly using
    // the hardcoded demo persona maps. Idempotent on subsequent calls.
    if (!user) {
      this.logger.warn(
        `Demo user not seeded for persona=${persona} — self-healing now`,
      );
      user = await this.ensureDemoUserSeeded(persona);
      seeded = true;
    }

    const tokens = await this.auth.issueTokens(user, ip ?? undefined);

    await this.prisma.auditLog.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        userId: user.id,
        action: 'demo.login',
        resource: seeded ? `persona:${persona}:seeded` : `persona:${persona}`,
        ip,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locale: user.locale,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            type: user.tenant.type,
            brand: user.tenant.brand,
            // GTM — demo tenants are ACTIVE; expose the onboarding signal so the
            // web's blocking gate never bounces a 1-click demo login.
            status: user.tenant.status,
            onboardingCompleted: user.tenant.onboardingCompletedAt !== null,
          }
        : null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * V7-C — Idempotently upsert the tenant + user rows for a known demo persona.
   * Used when the prod DB has not been seeded via `pnpm prisma db seed`.
   *
   * Only the 8 personas in `DEMO_PERSONA_MAP` can be self-healed: the email,
   * tenantSlug, role, and display name are all hardcoded — no arbitrary
   * creation possible.
   */
  private async ensureDemoUserSeeded(
    persona: DemoPersona,
  ): Promise<DemoUserWithTenant> {
    const config = DEMO_PERSONA_MAP[persona];
    const role = DEMO_ROLE_MAP[persona];
    const email = config.email.toLowerCase();
    const names = DEMO_USER_NAMES[email];

    if (!role || !names) {
      // Defensive — should never trigger since DEMO_*_MAP cover all personas.
      throw new NotFoundException({ code: 'UNKNOWN_PERSONA' });
    }

    // Upsert the tenant (if any). Super-admin has no tenant.
    let tenant: Tenant | null = null;
    if (config.tenantSlug) {
      const tenantData = DEMO_TENANT_MAP[config.tenantSlug];
      if (!tenantData) {
        throw new NotFoundException({ code: 'UNKNOWN_DEMO_TENANT' });
      }
      tenant = await this.prisma.tenant.upsert({
        where: { slug: config.tenantSlug },
        // GTM — demo tenants are always fully onboarded so the 1-click demo
        // login lands straight on the dashboard (no blocking onboarding gate).
        update: {
          name: tenantData.name,
          type: tenantData.type,
          status: 'ACTIVE',
          onboardingCompletedAt: new Date(),
        },
        create: {
          id: createId(),
          slug: config.tenantSlug,
          name: tenantData.name,
          type: tenantData.type,
          locale: Locale.fr,
          timezone: 'Africa/Tunis',
          status: 'ACTIVE',
          onboardingCompletedAt: new Date(),
        },
      });
    }

    // Generate a random 24-char password — never used (demo bypass) but
    // bcrypt-hashed for DB integrity (passwordHash is NOT NULL on User).
    const password = randomBytes(18).toString('base64url'); // ~24 chars
    const passwordHash = await bcrypt.hash(password, 12);

    // Upsert the user. Two paths because @@unique([tenantId, email]) cannot
    // express `tenantId IS NULL` as part of the composite key.
    let user: User;
    if (tenant) {
      user = await this.prisma.user.upsert({
        where: { email_per_tenant: { tenantId: tenant.id, email } },
        update: {
          firstName: names.firstName,
          lastName: names.lastName,
          role,
        },
        create: {
          id: createId(),
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: names.firstName,
          lastName: names.lastName,
          role,
          locale: Locale.fr,
        },
      });
    } else {
      const existing = await this.prisma.user.findFirst({
        where: { tenantId: null, email },
      });
      user =
        existing ??
        (await this.prisma.user.create({
          data: {
            id: createId(),
            tenantId: null,
            email,
            passwordHash,
            firstName: names.firstName,
            lastName: names.lastName,
            role,
            locale: Locale.fr,
          },
        }));
    }

    return { ...user, tenant };
  }
}
