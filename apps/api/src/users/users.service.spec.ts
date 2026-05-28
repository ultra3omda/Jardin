import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Locale, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../common/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SessionsService } from './sessions.service';
import { UsersService } from './users.service';

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

type PrismaMock = {
  user: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  refreshToken: {
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  auditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function buildPrismaMock(): PrismaMock {
  return {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Shared fixtures (synthetic data only)
// ---------------------------------------------------------------------------

const baseTenant = {
  id: 'tenant-1',
  name: 'Demo School',
  slug: 'demo',
  type: TenantType.KINDERGARTEN,
  locale: Locale.fr,
  timezone: 'Europe/Paris',
  brand: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

const baseUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'user@school.test',
  passwordHash: '', // set per-test via bcrypt.hash
  firstName: 'Alice',
  lastName: 'Dupont',
  role: UserRole.SCHOOL_ADMIN,
  locale: Locale.fr,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
  lastLoginAt: null,
  emailVerifiedAt: new Date('2024-01-01T00:00:00.000Z'),
  passwordChangedAt: null,
};

const META = { ip: '127.0.0.1', userAgent: 'vitest' };

// ---------------------------------------------------------------------------
// UsersService
// ---------------------------------------------------------------------------

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, def?: unknown) => {
              const map: Record<string, unknown> = {
                bcryptRounds: 4, // reduced for test speed
              };
              return map[key] ?? def;
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  // -------------------------------------------------------------------------
  // findMe
  // -------------------------------------------------------------------------
  describe('findMe', () => {
    it('returns user and tenant when user exists', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, tenant: baseTenant });

      const result = await service.findMe('user-1');

      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('user@school.test');
      expect(result.tenant?.slug).toBe('demo');
    });

    it('excludes the nested tenant from the user object (destructured away)', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, tenant: baseTenant });

      const result = await service.findMe('user-1');

      expect((result as { user: Record<string, unknown> }).user['tenant']).toBeUndefined();
    });

    it('filters by deletedAt: null so soft-deleted users are not found', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.findMe('user-1')).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });

    it('returns null tenant for a super_admin (no school attached)', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...baseUser,
        tenantId: null,
        role: UserRole.SUPER_ADMIN,
        tenant: null,
      });

      const result = await service.findMe('super-1');

      expect(result.tenant).toBeNull();
    });

    it('throws NotFoundException when the user id does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.findMe('nonexistent')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // updateProfile
  // -------------------------------------------------------------------------
  describe('updateProfile', () => {
    it('updates firstName and lastName, trimming surrounding whitespace', async () => {
      const updatedUser = { ...baseUser, firstName: 'Bob', lastName: 'Martin' };
      prisma.user.findFirst.mockResolvedValueOnce(baseUser);
      prisma.user.update.mockResolvedValueOnce(updatedUser);

      const dto: UpdateProfileDto = { firstName: '  Bob  ', lastName: '  Martin  ' };
      const result = await service.updateProfile('user-1', dto, META);

      expect(result.firstName).toBe('Bob');
      expect(result.lastName).toBe('Martin');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firstName: 'Bob', lastName: 'Martin' },
      });
    });

    it('updates locale when only locale is provided', async () => {
      const updatedUser = { ...baseUser, locale: Locale.en };
      prisma.user.findFirst.mockResolvedValueOnce(baseUser);
      prisma.user.update.mockResolvedValueOnce(updatedUser);

      const dto: UpdateProfileDto = { locale: Locale.en };
      const result = await service.updateProfile('user-1', dto, META);

      expect(result.locale).toBe(Locale.en);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { locale: Locale.en },
      });
    });

    it('omits undefined fields from the update payload', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(baseUser);
      prisma.user.update.mockResolvedValueOnce({ ...baseUser, firstName: 'Charlie' });

      await service.updateProfile('user-1', { firstName: 'Charlie' }, META);

      const updateCall = prisma.user.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(updateCall.data).not.toHaveProperty('lastName');
      expect(updateCall.data).not.toHaveProperty('locale');
    });

    it('throws NotFoundException for a non-existent or soft-deleted user', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateProfile('user-1', { firstName: 'X' }, META),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('writes an audit log entry after a successful update', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(baseUser);
      prisma.user.update.mockResolvedValueOnce(baseUser);

      await service.updateProfile('user-1', { firstName: 'Alice' }, META);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'users.profile_updated' }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // changePassword
  // -------------------------------------------------------------------------
  describe('changePassword', () => {
    it('hashes the new password and revokes all sessions in a single transaction', async () => {
      const passwordHash = await bcrypt.hash('OldPass#1234', 4);
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, passwordHash });

      const txUserUpdate = vi.fn().mockResolvedValue({});
      const txRefreshUpdate = vi.fn().mockResolvedValue({ count: 2 });
      prisma.$transaction.mockImplementationOnce(
        async (cb: (tx: unknown) => Promise<void>) =>
          cb({ user: { update: txUserUpdate }, refreshToken: { updateMany: txRefreshUpdate } }),
      );

      await service.changePassword(
        'user-1',
        { currentPassword: 'OldPass#1234', newPassword: 'NewSecurePass!9876' },
        META,
      );

      expect(txUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          passwordHash: expect.any(String),
          passwordChangedAt: expect.any(Date),
        }),
      });
      expect(txRefreshUpdate).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('stores a valid bcrypt hash — not the plaintext — for the new password', async () => {
      const passwordHash = await bcrypt.hash('OldPass#1234', 4);
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, passwordHash });

      let capturedHash: string | null = null;
      prisma.$transaction.mockImplementationOnce(
        async (cb: (tx: unknown) => Promise<void>) =>
          cb({
            user: {
              update: vi.fn().mockImplementation(({ data }: { data: { passwordHash: string } }) => {
                capturedHash = data.passwordHash;
                return Promise.resolve({});
              }),
            },
            refreshToken: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          }),
      );

      await service.changePassword(
        'user-1',
        { currentPassword: 'OldPass#1234', newPassword: 'BrandNewPass!9876' },
        META,
      );

      expect(capturedHash).not.toBeNull();
      expect(capturedHash).not.toBe('BrandNewPass!9876');
      const matches = await bcrypt.compare('BrandNewPass!9876', capturedHash!);
      expect(matches).toBe(true);
    });

    it('throws UnauthorizedException with CURRENT_PASSWORD_INVALID on wrong current password', async () => {
      const passwordHash = await bcrypt.hash('RealPassword#123', 4);
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, passwordHash });

      const dto: ChangePasswordDto = {
        currentPassword: 'WrongPassword#000',
        newPassword: 'SomethingNew#9999',
      };

      const err = await service.changePassword('user-1', dto, META).catch((e) => e);

      expect(err).toBeInstanceOf(UnauthorizedException);
      expect((err as UnauthorizedException).getResponse()).toMatchObject({
        code: 'CURRENT_PASSWORD_INVALID',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('writes a failure audit log when current password is wrong', async () => {
      const passwordHash = await bcrypt.hash('RealPassword#123', 4);
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, passwordHash });

      await service
        .changePassword(
          'user-1',
          { currentPassword: 'Wrong#0000000', newPassword: 'SomethingNew#9999' },
          META,
        )
        .catch(() => {});

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'users.password_change_failed' }),
        }),
      );
    });

    it('throws BadRequestException with NEW_PASSWORD_SAME_AS_CURRENT when new equals current', async () => {
      const samePassword = 'SamePassword#1234';
      const passwordHash = await bcrypt.hash(samePassword, 4);
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, passwordHash });

      const err = await service
        .changePassword('user-1', { currentPassword: samePassword, newPassword: samePassword }, META)
        .catch((e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'NEW_PASSWORD_SAME_AS_CURRENT',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.changePassword(
          'user-1',
          { currentPassword: 'Any#00000000', newPassword: 'Other#00000000' },
          META,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('writes a success audit log after a successful change', async () => {
      const passwordHash = await bcrypt.hash('OldPass#1234', 4);
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, passwordHash });
      prisma.$transaction.mockImplementationOnce(
        async (cb: (tx: unknown) => Promise<void>) =>
          cb({
            user: { update: vi.fn().mockResolvedValue({}) },
            refreshToken: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
          }),
      );

      await service.changePassword(
        'user-1',
        { currentPassword: 'OldPass#1234', newPassword: 'NewSecure#9876' },
        META,
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'users.password_changed' }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // softDelete
  // -------------------------------------------------------------------------
  describe('softDelete', () => {
    it('sets deletedAt on the user and revokes all active sessions in a transaction', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(baseUser);

      const txUserUpdate = vi.fn().mockResolvedValue({});
      const txRefreshUpdate = vi.fn().mockResolvedValue({ count: 3 });
      prisma.$transaction.mockImplementationOnce(
        async (cb: (tx: unknown) => Promise<void>) =>
          cb({ user: { update: txUserUpdate }, refreshToken: { updateMany: txRefreshUpdate } }),
      );

      await service.softDelete('user-1', META);

      expect(txUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(txRefreshUpdate).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('uses the same timestamp for both user.deletedAt and refreshToken.revokedAt', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(baseUser);

      let capturedUserTs: Date | null = null;
      let capturedTokenTs: Date | null = null;

      prisma.$transaction.mockImplementationOnce(
        async (cb: (tx: unknown) => Promise<void>) =>
          cb({
            user: {
              update: vi.fn().mockImplementation(({ data }: { data: { deletedAt: Date } }) => {
                capturedUserTs = data.deletedAt;
                return Promise.resolve({});
              }),
            },
            refreshToken: {
              updateMany: vi.fn().mockImplementation(({ data }: { data: { revokedAt: Date } }) => {
                capturedTokenTs = data.revokedAt;
                return Promise.resolve({ count: 1 });
              }),
            },
          }),
      );

      await service.softDelete('user-1', META);

      expect(capturedUserTs).not.toBeNull();
      expect(capturedTokenTs).not.toBeNull();
      expect(capturedUserTs!.getTime()).toBe(capturedTokenTs!.getTime());
    });

    it('throws NotFoundException when user is already soft-deleted or does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.softDelete('user-1', META)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('writes an audit log after a successful soft-delete', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(baseUser);
      prisma.$transaction.mockImplementationOnce(
        async (cb: (tx: unknown) => Promise<void>) =>
          cb({
            user: { update: vi.fn().mockResolvedValue({}) },
            refreshToken: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
          }),
      );

      await service.softDelete('user-1', META);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'users.soft_deleted' }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // V10 — push token (setPushToken / clearPushToken)
  // -------------------------------------------------------------------------
  describe('setPushToken', () => {
    it('persists the Expo token for an existing user', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'user-1' });
      prisma.user.update.mockResolvedValueOnce({});

      await service.setPushToken('user-1', 'ExponentPushToken[abc]');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { expoPushToken: 'ExponentPushToken[abc]' },
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.setPushToken('ghost', 'ExponentPushToken[abc]')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('clearPushToken', () => {
    it('nulls the Expo token for an existing user', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'user-1' });
      prisma.user.update.mockResolvedValueOnce({});

      await service.clearPushToken('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { expoPushToken: null },
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.clearPushToken('ghost')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // V10 — notification preferences (get / update)
  // -------------------------------------------------------------------------
  describe('getNotificationPreferences', () => {
    it('reports pushRegistered true when a token is present', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        pushEnabled: true,
        emailNotificationsEnabled: false,
        expoPushToken: 'ExponentPushToken[abc]',
      });

      const result = await service.getNotificationPreferences('user-1');

      expect(result).toEqual({
        pushEnabled: true,
        emailNotificationsEnabled: false,
        pushRegistered: true,
      });
    });

    it('reports pushRegistered false when no token is stored', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        pushEnabled: false,
        emailNotificationsEnabled: true,
        expoPushToken: null,
      });

      const result = await service.getNotificationPreferences('user-1');

      expect(result.pushRegistered).toBe(false);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.getNotificationPreferences('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateNotificationPreferences', () => {
    it('updates only the provided flags and returns the fresh preferences', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'user-1' });
      prisma.user.update.mockResolvedValueOnce({
        pushEnabled: false,
        emailNotificationsEnabled: true,
        expoPushToken: 'ExponentPushToken[abc]',
      });

      const result = await service.updateNotificationPreferences('user-1', { pushEnabled: false });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { pushEnabled: false },
        }),
      );
      expect(result).toEqual({
        pushEnabled: false,
        emailNotificationsEnabled: true,
        pushRegistered: true,
      });
    });

    it('omits undefined flags from the update payload', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'user-1' });
      prisma.user.update.mockResolvedValueOnce({
        pushEnabled: true,
        emailNotificationsEnabled: false,
        expoPushToken: null,
      });

      await service.updateNotificationPreferences('user-1', { emailNotificationsEnabled: false });

      const call = prisma.user.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(call.data).toEqual({ emailNotificationsEnabled: false });
      expect(call.data).not.toHaveProperty('pushEnabled');
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateNotificationPreferences('ghost', { pushEnabled: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// SessionsService
// ---------------------------------------------------------------------------

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(SessionsService);
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------
  describe('list', () => {
    it('returns active sessions mapped to SessionListItem shape (no token hash)', async () => {
      const future = new Date(Date.now() + 86_400_000);
      prisma.refreshToken.findMany.mockResolvedValueOnce([
        {
          id: 'rt-1',
          ip: '10.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date('2024-06-01T12:00:00.000Z'),
          expiresAt: future,
        },
      ]);

      const result = await service.list('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rt-1');
      expect(result[0].ip).toBe('10.0.0.1');
      expect(typeof result[0].createdAt).toBe('string');
      expect(typeof result[0].expiresAt).toBe('string');
      // Ensure raw token hash is never exposed
      expect(result[0]).not.toHaveProperty('tokenHash');
      expect(result[0]).not.toHaveProperty('revokedAt');
    });

    it('queries only non-revoked, non-expired sessions', async () => {
      prisma.refreshToken.findMany.mockResolvedValueOnce([]);

      await service.list('user-1');

      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            revokedAt: null,
            expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        }),
      );
    });

    it('orders sessions newest first', async () => {
      prisma.refreshToken.findMany.mockResolvedValueOnce([]);

      await service.list('user-1');

      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('returns an empty array when no active sessions exist', async () => {
      prisma.refreshToken.findMany.mockResolvedValueOnce([]);

      const result = await service.list('user-1');

      expect(result).toEqual([]);
    });

    it('handles null ip and userAgent gracefully', async () => {
      const future = new Date(Date.now() + 86_400_000);
      prisma.refreshToken.findMany.mockResolvedValueOnce([
        { id: 'rt-2', ip: null, userAgent: null, createdAt: new Date(), expiresAt: future },
      ]);

      const result = await service.list('user-1');

      expect(result[0].ip).toBeNull();
      expect(result[0].userAgent).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // revoke
  // -------------------------------------------------------------------------
  describe('revoke', () => {
    it('revokes the session scoped to the owner userId (cross-user revocation blocked)', async () => {
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.revoke('user-1', 'rt-abc', META);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'rt-abc', userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException with SESSION_NOT_FOUND_OR_ALREADY_REVOKED when count is 0', async () => {
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

      const err = await service.revoke('user-1', 'rt-foreign', META).catch((e) => e);

      expect(err).toBeInstanceOf(NotFoundException);
      expect((err as NotFoundException).getResponse()).toMatchObject({
        code: 'SESSION_NOT_FOUND_OR_ALREADY_REVOKED',
      });
    });

    it('cannot revoke another user\'s session (userId scoping ensures isolation)', async () => {
      // user-2 attempts to revoke a session that belongs to user-1 — count returns 0
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.revoke('user-2', 'rt-owned-by-user-1', META),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('writes an audit log with sessionId in metadata', async () => {
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.revoke('user-1', 'rt-xyz', META);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'users.session_revoked',
            metadata: expect.objectContaining({ sessionId: 'rt-xyz' }),
          }),
        }),
      );
    });

    it('does not propagate an audit log write failure (graceful degradation)', async () => {
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.auditLog.create.mockRejectedValueOnce(new Error('DB unavailable'));

      // Revoke should still resolve; only the audit is lost
      await expect(service.revoke('user-1', 'rt-1', META)).resolves.toBeUndefined();
    });
  });
});
