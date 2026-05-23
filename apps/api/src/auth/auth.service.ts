import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createId } from '@paralleldrive/cuid2';
import { Tenant, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { InviteTokensService } from '../admin/invite-tokens.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthResponseDto, MeResponseDto, TenantDto, UserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailVerificationService } from './email-verification.service';
import type { JwtPayload } from './strategies/jwt.strategy';
import { parseDurationMs } from './utils/duration.utils';
import type { RequestMeta } from './utils/request-meta.utils';
import { generateRefreshToken, hashRefreshToken } from './utils/token.utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly inviteTokens: InviteTokensService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  // ===== Public API =====

  async register(dto: RegisterDto, meta: RequestMeta): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(dto.admin.email);
    const slug = dto.tenant.slug.toLowerCase();

    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException({
        code: 'TENANT_SLUG_TAKEN',
        message: `Tenant slug "${slug}" is already taken`,
      });
    }

    // V1.5: /register is invite-only (Q4=B). Validate the token BEFORE
    // touching the DB. The actual consume happens inside the tx below so
    // tenant + user creation + token consume are atomic.
    const invite = await this.inviteTokens.validate(dto.inviteToken, email);

    // V1.5 simplification: only SCHOOL_ADMIN role is supported via the
    // /register flow (creating a brand-new tenant). Other intended roles
    // (TEACHER, PARENT, STAFF) will be supported via invite-to-existing-
    // tenant flows in V2+. SUPER_ADMIN can never be created via /register.
    if (invite.intendedRole !== UserRole.SCHOOL_ADMIN) {
      throw new BadRequestException({
        code: 'INVITE_ROLE_NOT_SUPPORTED_FOR_REGISTER',
        message: `Invites with role ${invite.intendedRole} cannot be consumed via /register — only SCHOOL_ADMIN.`,
      });
    }

    const rounds = this.config.get<number>('bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.admin.password, rounds);

    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          id: createId(),
          name: dto.tenant.name.trim(),
          slug,
          type: dto.tenant.type,
          locale: dto.tenant.locale ?? 'fr',
          timezone: dto.tenant.timezone ?? 'Europe/Paris',
        },
      });
      const newUser = await tx.user.create({
        data: {
          id: createId(),
          tenantId: newTenant.id,
          email,
          passwordHash,
          firstName: dto.admin.firstName.trim(),
          lastName: dto.admin.lastName.trim(),
          role: UserRole.SCHOOL_ADMIN,
          locale: dto.admin.locale ?? 'fr',
        },
      });
      // Consume the invite token in the same tx — atomic with tenant+user
      // creation. If anything below throws, the consume is rolled back.
      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), consumedByUserId: newUser.id },
      });
      return { tenant: newTenant, user: newUser };
    });

    await this.logAudit('auth.register', {
      userId: user.id,
      tenantId: tenant.id,
      metadata: { inviteTokenId: invite.id },
      ...meta,
    });

    // V1.5: trigger verification email. Best-effort — failure logged inside
    // the service and does NOT block registration.
    await this.emailVerification.mintAndSend(user, meta);

    return this.issueTokensAndBuildResponse(user, tenant, meta);
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const tenantSlug = dto.tenantSlug?.toLowerCase();

    const candidates = await this.prisma.user.findMany({
      where: {
        email,
        deletedAt: null,
        ...(tenantSlug ? { tenant: { slug: tenantSlug } } : {}),
      },
      include: { tenant: true },
    });

    if (candidates.length === 0) {
      await this.logAudit('auth.login.failed', {
        metadata: { email, reason: 'not-found' },
        ...meta,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (candidates.length > 1) {
      const slugs = candidates.map((c) => c.tenant?.slug).filter((s): s is string => !!s);
      throw new BadRequestException({
        code: 'TENANT_SLUG_REQUIRED',
        message: 'Multiple accounts match this email. Specify tenantSlug.',
        availableTenantSlugs: slugs,
      });
    }

    const user = candidates[0]!;

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.logAudit('auth.login.failed', {
        userId: user.id,
        tenantId: user.tenantId,
        metadata: { email, reason: 'bad-password' },
        ...meta,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // V1.5: block login if email not yet verified. Legacy users (pre-V1.5)
    // were grandfathered in the 20260522 migration so they are not blocked.
    if (!user.emailVerifiedAt) {
      await this.logAudit('auth.login.blocked.email_unverified', {
        userId: user.id,
        tenantId: user.tenantId,
        metadata: { email },
        ...meta,
      });
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Confirmez votre email avant de vous connecter.',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logAudit('auth.login.success', {
      userId: user.id,
      tenantId: user.tenantId,
      ...meta,
    });

    return this.issueTokensAndBuildResponse(user, user.tenant, meta);
  }

  async refresh(token: string, meta: RequestMeta): Promise<AuthResponseDto> {
    const tokenHash = hashRefreshToken(token);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { tenant: true } } },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (stored.revokedAt) {
      // Token reuse detected — revoke the entire chain (defense against theft).
      await this.revokeAllUserTokens(stored.userId);
      await this.logAudit('auth.token_reuse_detected', {
        userId: stored.userId,
        tenantId: stored.tenantId,
        metadata: { refreshTokenId: stored.id },
        ...meta,
      });
      this.logger.warn(
        `Refresh token reuse detected for user=${stored.userId} (tenant=${stored.tenantId}). All sessions revoked.`,
      );
      throw new UnauthorizedException('Refresh token reuse detected — please log in again');
    }

    // Rotate
    const newRaw = generateRefreshToken();
    const newId = createId();
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.create({
        data: {
          id: newId,
          tenantId: stored.tenantId,
          userId: stored.userId,
          tokenHash: hashRefreshToken(newRaw),
          expiresAt: this.computeRefreshExpiry(),
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), replacedByTokenId: newId },
      });
    });

    await this.logAudit('auth.refresh', {
      userId: stored.userId,
      tenantId: stored.tenantId,
      ...meta,
    });

    const accessToken = await this.signAccessToken(stored.user);
    return {
      accessToken,
      refreshToken: newRaw,
      user: this.userToDto(stored.user),
      tenant: stored.user.tenant ? this.tenantToDto(stored.user.tenant) : null,
    };
  }

  async logout(token: string, meta: RequestMeta): Promise<void> {
    const tokenHash = hashRefreshToken(token);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      await this.logAudit('auth.logout', {
        userId: stored.userId,
        tenantId: stored.tenantId,
        ...meta,
      });
    }
    // Silently succeed for unknown/already-revoked tokens — avoids leaking info
  }

  /**
   * Resend the email-verification email for the current user. Throws if
   * the user is already verified — avoids spamming on accident.
   */
  async resendVerificationEmail(userId: string, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, emailVerifiedAt: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException({
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Votre email est déjà confirmé.',
      });
    }
    await this.emailVerification.mintAndSend(
      { id: user.id, email: user.email, firstName: user.firstName },
      meta,
    );
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { tenant: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      user: this.userToDto(user),
      tenant: user.tenant ? this.tenantToDto(user.tenant) : null,
    };
  }

  // ===== Private =====

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn', '15m'),
    });
  }

  private computeRefreshExpiry(): Date {
    const ms = parseDurationMs(this.config.get<string>('jwt.refreshExpiresIn', '30d'));
    return new Date(Date.now() + ms);
  }

  private async issueTokensAndBuildResponse(
    user: User,
    tenant: Tenant | null,
    meta: RequestMeta,
  ): Promise<AuthResponseDto> {
    const accessToken = await this.signAccessToken(user);
    const refreshTokenPlaintext = generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash: hashRefreshToken(refreshTokenPlaintext),
        expiresAt: this.computeRefreshExpiry(),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenPlaintext,
      user: this.userToDto(user),
      tenant: tenant ? this.tenantToDto(tenant) : null,
    };
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async logAudit(
    action: string,
    opts: { tenantId?: string | null; userId?: string | null; metadata?: object } & RequestMeta,
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
      // Audit logging failures must never break the auth flow
      this.logger.error(`Failed to write audit log for action=${action}: ${String(err)}`);
    }
  }

  private userToDto(user: User): UserDto {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      locale: user.locale,
    };
  }

  private tenantToDto(tenant: Tenant): TenantDto {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      type: tenant.type,
      locale: tenant.locale,
      timezone: tenant.timezone,
      // V1.6 — pass-through the raw JSONB brand (TenantBrand partial or null).
      // The web layout merges over DEFAULT_BRAND before injecting CSS vars.
      brand: (tenant.brand ?? null) as TenantDto['brand'],
    };
  }
}
