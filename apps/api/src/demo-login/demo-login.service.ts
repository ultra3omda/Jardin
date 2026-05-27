import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';

import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { DEMO_PERSONA_MAP } from './demo-login.constants';
import type { DemoPersona } from './dto/demo-login.dto';

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

    const user = await this.prisma.user.findFirst({
      where: {
        email: config.email.toLowerCase(),
        tenant: config.tenantSlug ? { slug: config.tenantSlug } : null,
        deletedAt: null,
      },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.warn(`Demo user not seeded for persona=${persona}`);
      throw new NotFoundException({ code: 'DEMO_USER_NOT_SEEDED' });
    }

    const tokens = await this.auth.issueTokens(user, ip ?? undefined);

    await this.prisma.auditLog.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        userId: user.id,
        action: 'demo.login',
        resource: `persona:${persona}`,
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
          }
        : null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
