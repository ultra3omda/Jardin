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

  /**
   * 30s grace window during which a revoked refresh token (with replacedByTokenId)
   * is treated as a legitimate concurrent rotation race instead of token reuse.
   *
   * Background : V1.5+ refresh-token rotation revokes the OLD token on every
   * successful /refresh call. When two requests race (multi-tab, SSR/CSR
   * overlap, edge-region fan-out), the second one sees the just-revoked token
   * and used to trigger reuse-detection → ALL sessions revoked → infinite 401
   * loop in the browser. This window lets the second request succeed by
   * issuing a fresh rotation, only logging an audit + debug for observability.
   *
   * If a revoked token is presented OUTSIDE this window (or without a
   * replacedByTokenId), the original defense kicks in: revoke all user tokens
   * (real theft signal). See IETF OAuth 2.1 §6.1, Auth0/Okta best practices.
   */
  private static readonly REFRESH_GRACE_WINDOW_MS = 30_000;

  /**
   * Account lockout (brute-force defense). After {@link LOCKOUT_THRESHOLD}
   * failed password attempts within {@link LOCKOUT_WINDOW_MS}, a known account
   * is temporarily locked. This complements the per-IP login throttle: the
   * throttle stops one IP hammering many accounts; the lockout stops a
   * distributed attack hammering ONE account from many IPs.
   *
   * State is derived from existing `auth.login.failed` / `auth.login.success`
   * audit rows (no schema migration): we count failures since the more recent
   * of (now − window) and the account's last successful login, so a successful
   * login clears the lock and the window slides naturally.
   */
  private static readonly LOCKOUT_THRESHOLD = 10;
  private static readonly LOCKOUT_WINDOW_MS = 15 * 60_000;

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
    const slug = dto.tenant?.slug.toLowerCase();

    // When the registrant brings new-tenant details, reject a taken slug up
    // front — a cheap check before we even validate (and later consume) the
    // invite. Tenant-bound invites (commercial flow) carry no slug here.
    if (slug) {
      const existing = await this.prisma.tenant.findUnique({ where: { slug } });
      if (existing) {
        throw new BadRequestException({
          code: 'TENANT_SLUG_TAKEN',
          message: `Tenant slug "${slug}" is already taken`,
        });
      }
    }

    // V1.5: /register is invite-only (Q4=B). Validate the token BEFORE
    // touching the DB. The actual consume happens inside the tx below so
    // tenant + user creation + token consume are atomic.
    const invite = await this.inviteTokens.validate(dto.inviteToken, email);

    // Only SCHOOL_ADMIN can be created via /register (creating/joining a tenant).
    // Other roles (TEACHER, PARENT, STAFF) are provisioned by a SCHOOL_ADMIN
    // inside their tenant; SUPER_ADMIN/COMMERCIAL never via /register.
    if (invite.intendedRole !== UserRole.SCHOOL_ADMIN) {
      throw new BadRequestException({
        code: 'INVITE_ROLE_NOT_SUPPORTED_FOR_REGISTER',
        message: `Invites with role ${invite.intendedRole} cannot be consumed via /register — only SCHOOL_ADMIN.`,
      });
    }

    // GTM — two registration shapes depending on the invite:
    //  • invite bound to a tenant → the commercial already created the org;
    //    attach the new admin to it (no new tenant, no slug needed). The org
    //    stays PENDING_ONBOARDING so the admin is forced through the wizard.
    //  • unbound invite → legacy self-serve: the admin creates a brand-new
    //    tenant from dto.tenant (still PENDING_ONBOARDING).
    //  NB: use Boolean() — a mock/DB row may carry `undefined` vs `null`.
    const boundToExistingTenant = Boolean(invite.tenantId);
    if (!boundToExistingTenant && !dto.tenant) {
      throw new BadRequestException({
        code: 'TENANT_DETAILS_REQUIRED',
        message: 'Cette invitation nécessite les informations de l’organisation.',
      });
    }

    const rounds = this.config.get<number>('bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.admin.password, rounds);

    // V1.6: when the invite is bound to a specific email, the inviter has
    // already vetted that exact address (and validate() above just confirmed
    // admin.email matches it). We therefore trust it and mark the email as
    // verified at registration, so the invitee can re-login immediately without
    // the email round-trip. Open (email-less) invites keep the verification
    // gate, since no one has vetted the address the invitee typed in.
    const autoVerified = invite.invitedEmail !== null;

    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const targetTenant = boundToExistingTenant
        ? await tx.tenant.findUniqueOrThrow({ where: { id: invite.tenantId! } })
        : await tx.tenant.create({
            data: {
              id: createId(),
              name: dto.tenant!.name.trim(),
              slug: slug!,
              type: dto.tenant!.type,
              locale: dto.tenant!.locale ?? 'fr',
              timezone: dto.tenant!.timezone ?? 'Europe/Paris',
            },
          });
      const newUser = await tx.user.create({
        data: {
          id: createId(),
          tenantId: targetTenant.id,
          email,
          passwordHash,
          firstName: dto.admin.firstName.trim(),
          lastName: dto.admin.lastName.trim(),
          role: UserRole.SCHOOL_ADMIN,
          locale: dto.admin.locale ?? 'fr',
          emailVerifiedAt: autoVerified ? new Date() : null,
        },
      });
      // Consume the invite token in the same tx — atomic with tenant+user
      // creation. If anything below throws, the consume is rolled back.
      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), consumedByUserId: newUser.id },
      });
      return { tenant: targetTenant, user: newUser };
    });

    await this.logAudit('auth.register', {
      userId: user.id,
      tenantId: tenant.id,
      metadata: { inviteTokenId: invite.id },
      ...meta,
    });

    // V1.5/V1.6: only open invites need the verification email — email-bound
    // invites are auto-verified above. Best-effort either way: failure is logged
    // inside the service and does NOT block registration.
    if (!autoVerified) {
      await this.emailVerification.mintAndSend(user, meta);
    }

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

    // Brute-force lockout: block (without burning a bcrypt compare) when this
    // account has accumulated too many recent failures across all IPs.
    if (await this.isAccountLocked(user.id)) {
      await this.logAudit('auth.login.locked', {
        userId: user.id,
        tenantId: user.tenantId,
        metadata: { email },
        ...meta,
      });
      throw new ForbiddenException({
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
        message:
          'Trop de tentatives de connexion. Réessayez dans quelques minutes ou réinitialisez votre mot de passe.',
      });
    }

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
      const ageMs = Date.now() - stored.revokedAt.getTime();
      const withinGrace =
        ageMs < AuthService.REFRESH_GRACE_WINDOW_MS && !!stored.replacedByTokenId;

      if (withinGrace) {
        // Legitimate concurrent rotation race (multi-tab, SSR/CSR overlap).
        // Issue a fresh refresh token WITHOUT revoking all sessions.
        const newRaw = generateRefreshToken();
        const newId = createId();
        await this.prisma.refreshToken.create({
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

        await this.logAudit('auth.refresh.grace_window', {
          userId: stored.userId,
          tenantId: stored.tenantId,
          metadata: { originalTokenId: stored.id, revokedAgeMs: ageMs },
          ...meta,
        });
        this.logger.debug(
          `Refresh grace window applied for user=${stored.userId} (age=${ageMs}ms)`,
        );

        const accessToken = await this.signAccessToken(stored.user);
        return {
          accessToken,
          refreshToken: newRaw,
          user: this.userToDto(stored.user),
          tenant: stored.user.tenant ? this.tenantToDto(stored.user.tenant) : null,
        };
      }

      // Outside grace window OR never-rotated revoked token → REAL reuse.
      // Existing defense: revoke all user tokens to defeat token theft.
      await this.revokeAllUserTokens(stored.userId);
      await this.logAudit('auth.token_reuse_detected', {
        userId: stored.userId,
        tenantId: stored.tenantId,
        metadata: { refreshTokenId: stored.id, revokedAgeMs: ageMs },
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

  /**
   * V7 — Public alias used by DemoLoginService. Wraps the private
   * `issueTokensAndBuildResponse` so callers outside this class can issue
   * tokens for a (user, tenant) pair without going through password check.
   */
  async issueTokens(user: User, ip?: string | null): Promise<AuthResponseDto> {
    return this.issueTokensAndBuildResponse(
      user,
      // We rely on the caller passing a user with `tenant` included or null.
      // Cast is safe: TypeScript narrows via the cast and runtime accepts null.
      (user as User & { tenant?: Tenant | null }).tenant ?? null,
      { ip: ip ?? undefined, userAgent: undefined },
    );
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

  /**
   * Returns true when the account has ≥ LOCKOUT_THRESHOLD failed login attempts
   * since the more recent of (now − window) and its last successful login.
   * Derived from audit rows — no dedicated lockout column. Fails open (returns
   * false) on any error so an audit/DB hiccup never locks everyone out.
   */
  private async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const windowStart = new Date(Date.now() - AuthService.LOCKOUT_WINDOW_MS);
      const lastSuccess = await this.prisma.auditLog.findFirst({
        where: { userId, action: 'auth.login.success' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      const since =
        lastSuccess && lastSuccess.createdAt > windowStart ? lastSuccess.createdAt : windowStart;
      const failures = await this.prisma.auditLog.count({
        where: { userId, action: 'auth.login.failed', createdAt: { gte: since } },
      });
      return failures >= AuthService.LOCKOUT_THRESHOLD;
    } catch (err) {
      this.logger.error(`Lockout check failed for user=${userId}: ${String(err)}`);
      return false;
    }
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
      // GTM — onboarding gate signal for the web.
      status: tenant.status,
      onboardingCompleted: tenant.onboardingCompletedAt !== null,
    };
  }
}
