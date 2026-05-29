import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Locale, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InviteTokensService } from '../admin/invite-tokens.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';

type EmailVerificationMock = {
  mintAndSend: ReturnType<typeof vi.fn>;
  consume: ReturnType<typeof vi.fn>;
};

const VALID_INVITE_TOKEN = 'a-valid-token-string-at-least-20-chars';
const INVITE_ROW = {
  id: 'inv-1',
  tokenHash: 'hash',
  invitedEmail: null as string | null,
  intendedRole: UserRole.SCHOOL_ADMIN,
  createdById: 'super-1',
  consumedByUserId: null as string | null,
  expiresAt: new Date(Date.now() + 86_400_000),
  consumedAt: null as Date | null,
  createdAt: new Date(),
};

type InviteTokensMock = {
  validate: ReturnType<typeof vi.fn>;
  validateAndConsume: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  revoke: ReturnType<typeof vi.fn>;
};

type PrismaMock = {
  tenant: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  user: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  refreshToken: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  auditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function buildPrismaMock(): PrismaMock {
  return {
    tenant: { findUnique: vi.fn(), create: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    refreshToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  };
}

const baseUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'user@test.example',
  passwordHash: '', // filled per test
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.SCHOOL_ADMIN,
  locale: Locale.fr,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  lastLoginAt: null,
  emailVerifiedAt: new Date(), // V1.5: default verified so login tests aren't blocked
  passwordChangedAt: null,
};

const baseTenant = {
  id: 'tenant-1',
  name: 'Demo',
  slug: 'demo',
  type: TenantType.KINDERGARTEN,
  locale: Locale.fr,
  timezone: 'Europe/Paris',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let inviteTokens: InviteTokensMock;
  let emailVerification: EmailVerificationMock;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    inviteTokens = {
      validate: vi.fn().mockResolvedValue({ ...INVITE_ROW }),
      validateAndConsume: vi.fn(),
      create: vi.fn(),
      list: vi.fn(),
      revoke: vi.fn(),
    };
    emailVerification = {
      mintAndSend: vi.fn().mockResolvedValue(undefined),
      consume: vi.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: InviteTokensService, useValue: inviteTokens },
        { provide: EmailVerificationService, useValue: emailVerification },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn().mockResolvedValue('signed-access-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, def?: unknown) => {
              const map: Record<string, unknown> = {
                bcryptRounds: 4, // fast for tests
                'jwt.accessSecret': 'a'.repeat(32),
                'jwt.accessExpiresIn': '15m',
                'jwt.refreshExpiresIn': '30d',
              };
              return map[key] ?? def;
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  // ---------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------
  describe('login', () => {
    it('throws UnauthorizedException when email is not found', async () => {
      prisma.user.findMany.mockResolvedValueOnce([]);
      await expect(
        service.login({ email: 'nobody@x.test', password: 'pwdpwdpwdpwd' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'auth.login.failed' }),
        }),
      );
    });

    it('returns 400 with available slugs when email matches multiple tenants', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        { ...baseUser, id: 'u1', tenantId: 't1', tenant: { ...baseTenant, slug: 'a' } },
        { ...baseUser, id: 'u2', tenantId: 't2', tenant: { ...baseTenant, slug: 'b' } },
      ]);

      const err = await service.login({ email: 'x@y.test', password: 'pwdpwdpwdpwd' }, {}).catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      const response = (err as BadRequestException).getResponse() as {
        code: string;
        availableTenantSlugs: string[];
      };
      expect(response.code).toBe('TENANT_SLUG_REQUIRED');
      expect(response.availableTenantSlugs).toEqual(['a', 'b']);
    });

    it('issues tokens for super_admin (tenantId null, no tenant relation)', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      prisma.user.findMany.mockResolvedValueOnce([
        {
          ...baseUser,
          id: 'super-1',
          tenantId: null,
          role: UserRole.SUPER_ADMIN,
          passwordHash,
          tenant: null,
        },
      ]);
      prisma.user.update.mockResolvedValueOnce({});
      prisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.login(
        { email: 'super@x.test', password: 'correct-password' },
        { ip: '127.0.0.1', userAgent: 'vitest' },
      );

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(result.user.id).toBe('super-1');
      expect(result.user.role).toBe(UserRole.SUPER_ADMIN);
      expect(result.tenant).toBeNull();
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: null, userId: 'super-1' }),
        }),
      );
    });

    it('throws UnauthorizedException on bad password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      prisma.user.findMany.mockResolvedValueOnce([
        { ...baseUser, passwordHash, tenant: baseTenant },
      ]);
      await expect(
        service.login({ email: baseUser.email, password: 'wrong-password' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('blocks login with EMAIL_NOT_VERIFIED when emailVerifiedAt is null', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      prisma.user.findMany.mockResolvedValueOnce([
        { ...baseUser, passwordHash, emailVerifiedAt: null, tenant: baseTenant },
      ]);

      const err = await service
        .login({ email: baseUser.email, password: 'correct-password' }, {})
        .catch((e) => e);

      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'EMAIL_NOT_VERIFIED',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'auth.login.blocked.email_unverified' }),
        }),
      );
    });

    it('issues tokens on success and updates lastLoginAt', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      prisma.user.findMany.mockResolvedValueOnce([
        { ...baseUser, passwordHash, tenant: baseTenant },
      ]);
      prisma.user.update.mockResolvedValueOnce({ ...baseUser, passwordHash });
      prisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.login(
        { email: baseUser.email, password: 'correct-password' },
        { ip: '127.0.0.1', userAgent: 'vitest' },
      );

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(result.user.id).toBe('user-1');
      expect(result.tenant?.slug).toBe('demo');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------
  // refresh
  // ---------------------------------------------------------------------
  describe('refresh', () => {
    it('throws 401 when token is unknown', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
      await expect(service.refresh('some-token', {})).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws 401 when token is expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'rt1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        expiresAt: new Date(Date.now() - 1_000),
        revokedAt: null,
        user: { ...baseUser, tenant: baseTenant },
      });
      await expect(service.refresh('some-token', {})).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('detects reuse and revokes the whole chain', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'rt1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
        user: { ...baseUser, tenant: baseTenant },
      });

      await expect(service.refresh('reused', {})).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'auth.token_reuse_detected' }),
        }),
      );
    });

    it('rotates the token on success', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'rt1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        user: { ...baseUser, tenant: baseTenant },
      });
      prisma.$transaction.mockImplementationOnce(async (cb) =>
        cb({
          refreshToken: { create: vi.fn(), update: vi.fn() },
        }),
      );

      const result = await service.refresh('current', {});
      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(result.refreshToken).not.toBe('current');
    });
  });

  // ---------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------
  describe('logout', () => {
    it('revokes the token when found and active', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'rt1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        revokedAt: null,
      });
      await service.logout('whatever', {});
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('silently succeeds when the token is unknown', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
      await expect(service.logout('unknown', {})).resolves.toBeUndefined();
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------
  // me
  // ---------------------------------------------------------------------
  describe('me', () => {
    it('returns the user and tenant', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, tenant: baseTenant });
      const result = await service.me('user-1');
      expect(result.user.id).toBe('user-1');
      expect(result.tenant?.slug).toBe('demo');
    });

    it('throws 401 when the user is gone', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(service.me('user-1')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ---------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------
  describe('register', () => {
    it('rejects when slug is taken (before invite validation)', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({ ...baseTenant });
      await expect(
        service.register(
          {
            inviteToken: VALID_INVITE_TOKEN,
            tenant: { name: 'X', slug: 'demo', type: TenantType.KINDERGARTEN },
            admin: {
              email: 'a@b.test',
              firstName: 'A',
              lastName: 'B',
              password: 'pwdpwdpwdpwd',
            },
          },
          {},
        ),
      ).rejects.toMatchObject({ response: { code: 'TENANT_SLUG_TAKEN' } });
      expect(inviteTokens.validate).not.toHaveBeenCalled();
    });

    it('propagates INVITE_TOKEN_UNKNOWN from the invite-tokens service', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null);
      inviteTokens.validate.mockRejectedValueOnce(
        new BadRequestException({ code: 'INVITE_TOKEN_UNKNOWN' }),
      );

      const err = await service
        .register(
          {
            inviteToken: VALID_INVITE_TOKEN,
            tenant: { name: 'X', slug: 'new', type: TenantType.KINDERGARTEN },
            admin: {
              email: 'a@b.test',
              firstName: 'A',
              lastName: 'B',
              password: 'pwdpwdpwdpwd',
            },
          },
          {},
        )
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'INVITE_TOKEN_UNKNOWN',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects invites whose intendedRole is not SCHOOL_ADMIN', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null);
      inviteTokens.validate.mockResolvedValueOnce({
        ...INVITE_ROW,
        intendedRole: UserRole.TEACHER,
      });

      const err = await service
        .register(
          {
            inviteToken: VALID_INVITE_TOKEN,
            tenant: { name: 'X', slug: 'new', type: TenantType.KINDERGARTEN },
            admin: {
              email: 'a@b.test',
              firstName: 'A',
              lastName: 'B',
              password: 'pwdpwdpwdpwd',
            },
          },
          {},
        )
        .catch((e) => e);

      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'INVITE_ROLE_NOT_SUPPORTED_FOR_REGISTER',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('creates tenant + admin + consumes invite in a single tx and issues tokens (open invite → unverified + email sent)', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null);
      const txInviteUpdate = vi.fn().mockResolvedValue({ ...INVITE_ROW });
      const txUserCreate = vi
        .fn()
        .mockResolvedValue({ ...baseUser, id: 'user-2', tenantId: 'tenant-2', emailVerifiedAt: null });
      prisma.$transaction.mockImplementationOnce(async (cb) => {
        const tx = {
          tenant: { create: vi.fn().mockResolvedValue({ ...baseTenant, slug: 'new', id: 'tenant-2' }) },
          user: { create: txUserCreate },
          inviteToken: { update: txInviteUpdate },
        };
        return cb(tx);
      });
      prisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.register(
        {
          inviteToken: VALID_INVITE_TOKEN,
          tenant: { name: 'New School', slug: 'new', type: TenantType.PRIMARY_SCHOOL },
          admin: {
            email: 'Founder@New.School',
            firstName: 'Found',
            lastName: 'Er',
            password: 'pwdpwdpwdpwd',
          },
        },
        {},
      );

      expect(result.tenant?.slug).toBe('new');
      expect(result.user.id).toBe('user-2');
      expect(result.accessToken).toBe('signed-access-token');
      expect(inviteTokens.validate).toHaveBeenCalledWith(VALID_INVITE_TOKEN, 'founder@new.school');
      expect(txInviteUpdate).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          consumedByUserId: 'user-2',
          consumedAt: expect.any(Date),
        }),
      });
      // Open invite (no invitedEmail) → email stays UNVERIFIED and the
      // verification email IS sent so the invitee can later confirm.
      expect(txUserCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ emailVerifiedAt: null }),
      });
      expect(emailVerification.mintAndSend).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-2' }),
        expect.any(Object),
      );
    });

    it('auto-verifies the admin and skips the verification email when the invite is email-bound', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null);
      // Email-bound invite: validate() returns a row whose invitedEmail matches
      // the (normalized) admin email — the super-admin already vetted it.
      inviteTokens.validate.mockResolvedValueOnce({
        ...INVITE_ROW,
        invitedEmail: 'founder@new.school',
      });
      const txUserCreate = vi
        .fn()
        .mockResolvedValue({ ...baseUser, id: 'user-3', tenantId: 'tenant-3', emailVerifiedAt: new Date() });
      prisma.$transaction.mockImplementationOnce(async (cb) => {
        const tx = {
          tenant: { create: vi.fn().mockResolvedValue({ ...baseTenant, slug: 'bound', id: 'tenant-3' }) },
          user: { create: txUserCreate },
          inviteToken: { update: vi.fn().mockResolvedValue({ ...INVITE_ROW }) },
        };
        return cb(tx);
      });
      prisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.register(
        {
          inviteToken: VALID_INVITE_TOKEN,
          tenant: { name: 'Bound School', slug: 'bound', type: TenantType.PRIMARY_SCHOOL },
          admin: {
            email: 'Founder@New.School',
            firstName: 'Found',
            lastName: 'Er',
            password: 'pwdpwdpwdpwd',
          },
        },
        {},
      );

      expect(result.user.id).toBe('user-3');
      // Email-bound invite → user persisted as ALREADY verified...
      expect(txUserCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
      });
      // ...and NO verification email is sent (the address is already trusted).
      expect(emailVerification.mintAndSend).not.toHaveBeenCalled();
    });
  });
});
