import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../common/prisma/prisma.service';
import { hashRefreshToken } from '../auth/utils/token.utils';
import { InviteTokensService } from './invite-tokens.service';

type PrismaMock = {
  inviteToken: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

function buildPrismaMock(): PrismaMock {
  return {
    inviteToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
}

const baseToken = {
  id: 'inv-1',
  tokenHash: '<set per test>',
  invitedEmail: null as string | null,
  intendedRole: UserRole.SCHOOL_ADMIN,
  createdById: 'super-1',
  consumedByUserId: null as string | null,
  expiresAt: new Date(Date.now() + 86_400_000),
  consumedAt: null as Date | null,
  createdAt: new Date(),
};

describe('InviteTokensService', () => {
  let service: InviteTokensService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        InviteTokensService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, def?: unknown) => {
              const map: Record<string, unknown> = {
                webAppUrl: 'https://app.test.example',
              };
              return map[key] ?? def;
            }),
          },
        },
      ],
    }).compile();
    service = moduleRef.get(InviteTokensService);
  });

  describe('create', () => {
    it('persists hash + audit, returns plaintext URL once', async () => {
      const result = await service.create('super-1', {
        invitedEmail: 'New@User.com',
        intendedRole: UserRole.SCHOOL_ADMIN,
        expiresInDays: 7,
      });

      expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(result.url).toBe(`https://app.test.example/register?token=${result.token}`);
      expect(result.invitedEmail).toBe('new@user.com');
      expect(result.intendedRole).toBe(UserRole.SCHOOL_ADMIN);

      const createCall = prisma.inviteToken.create.mock.calls[0]?.[0];
      expect(createCall?.data?.tokenHash).toBe(hashRefreshToken(result.token));
      expect(createCall?.data?.invitedEmail).toBe('new@user.com');
      expect(createCall?.data?.createdById).toBe('super-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'admin.invite_token.mint',
            tenantId: null,
            userId: 'super-1',
          }),
        }),
      );
    });

    it('defaults intendedRole to SCHOOL_ADMIN and expiresInDays to 7', async () => {
      const before = Date.now();
      const result = await service.create('super-1', {});
      expect(result.intendedRole).toBe(UserRole.SCHOOL_ADMIN);
      expect(result.invitedEmail).toBeNull();
      const expiresAt = new Date(result.expiresAt).getTime();
      const seven = 7 * 86_400_000;
      expect(expiresAt).toBeGreaterThanOrEqual(before + seven - 1_000);
      expect(expiresAt).toBeLessThanOrEqual(before + seven + 5_000);
    });
  });

  describe('validateAndConsume', () => {
    it('throws INVITE_TOKEN_UNKNOWN when no row matches the hash', async () => {
      prisma.inviteToken.findUnique.mockResolvedValueOnce(null);
      const err = await service
        .validateAndConsume('plaintext-xyz', 'user-1', 'a@b.test')
        .catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'INVITE_TOKEN_UNKNOWN',
      });
    });

    it('throws INVITE_TOKEN_CONSUMED when consumedAt is already set', async () => {
      prisma.inviteToken.findUnique.mockResolvedValueOnce({
        ...baseToken,
        consumedAt: new Date(),
      });
      const err = await service
        .validateAndConsume('p', 'user-1', 'a@b.test')
        .catch((e) => e);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'INVITE_TOKEN_CONSUMED',
      });
    });

    it('throws INVITE_TOKEN_EXPIRED when expiresAt is in the past', async () => {
      prisma.inviteToken.findUnique.mockResolvedValueOnce({
        ...baseToken,
        expiresAt: new Date(Date.now() - 1_000),
      });
      const err = await service
        .validateAndConsume('p', 'user-1', 'a@b.test')
        .catch((e) => e);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'INVITE_TOKEN_EXPIRED',
      });
    });

    it('throws INVITE_EMAIL_MISMATCH when invitedEmail is pinned and differs', async () => {
      prisma.inviteToken.findUnique.mockResolvedValueOnce({
        ...baseToken,
        invitedEmail: 'expected@test.example',
      });
      const err = await service
        .validateAndConsume('p', 'user-1', 'other@test.example')
        .catch((e) => e);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'INVITE_EMAIL_MISMATCH',
      });
    });

    it('succeeds and marks consumedAt + consumedByUserId on valid token', async () => {
      prisma.inviteToken.findUnique.mockResolvedValueOnce({ ...baseToken });
      prisma.inviteToken.update.mockResolvedValueOnce({
        ...baseToken,
        consumedAt: new Date(),
        consumedByUserId: 'user-1',
      });

      const result = await service.validateAndConsume('p', 'user-1', 'a@b.test');
      expect(result.consumedByUserId).toBe('user-1');
      expect(prisma.inviteToken.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ consumedByUserId: 'user-1', consumedAt: expect.any(Date) }),
      });
    });

    it('accepts case-insensitive email match', async () => {
      prisma.inviteToken.findUnique.mockResolvedValueOnce({
        ...baseToken,
        invitedEmail: 'pinned@test.example',
      });
      prisma.inviteToken.update.mockResolvedValueOnce({ ...baseToken });
      await expect(
        service.validateAndConsume('p', 'user-1', 'PINNED@test.example'),
      ).resolves.toBeTruthy();
    });
  });

  describe('revoke', () => {
    it('throws INVITE_TOKEN_NOT_FOUND for unknown id', async () => {
      prisma.inviteToken.findUnique.mockResolvedValueOnce(null);
      await expect(service.revoke('missing', 'super-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to revoke already-consumed tokens', async () => {
      prisma.inviteToken.findUnique.mockResolvedValueOnce({
        ...baseToken,
        consumedAt: new Date(),
      });
      const err = await service.revoke('inv-1', 'super-1').catch((e) => e);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'INVITE_TOKEN_ALREADY_CONSUMED',
      });
    });

    it('sets expiresAt to now and writes audit', async () => {
      prisma.inviteToken.findUnique.mockResolvedValueOnce({ ...baseToken });
      prisma.inviteToken.update.mockResolvedValueOnce({ ...baseToken });
      await service.revoke('inv-1', 'super-1');
      const updateCall = prisma.inviteToken.update.mock.calls[0]?.[0];
      expect(updateCall?.where).toEqual({ id: 'inv-1' });
      expect(updateCall?.data?.expiresAt).toBeInstanceOf(Date);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'admin.invite_token.revoke' }),
        }),
      );
    });
  });

  describe('list', () => {
    it('derives status pending/expired/consumed', async () => {
      const now = Date.now();
      prisma.inviteToken.findMany.mockResolvedValueOnce([
        { ...baseToken, id: 'pending', expiresAt: new Date(now + 1_000) },
        { ...baseToken, id: 'expired', expiresAt: new Date(now - 1_000) },
        { ...baseToken, id: 'consumed', consumedAt: new Date(), expiresAt: new Date(now + 1_000) },
      ]);
      const items = await service.list();
      expect(items.find((i) => i.id === 'pending')?.status).toBe('pending');
      expect(items.find((i) => i.id === 'expired')?.status).toBe('expired');
      expect(items.find((i) => i.id === 'consumed')?.status).toBe('consumed');
      expect(prisma.inviteToken.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('applies the status filter', async () => {
      const now = Date.now();
      prisma.inviteToken.findMany.mockResolvedValueOnce([
        { ...baseToken, id: 'a', expiresAt: new Date(now + 1_000) },
        { ...baseToken, id: 'b', expiresAt: new Date(now - 1_000) },
      ]);
      const pending = await service.list('pending');
      expect(pending.map((i) => i.id)).toEqual(['a']);
    });
  });

  describe('create — baseUrlOverride', () => {
    it('builds the register URL from the override host when provided', async () => {
      const result = await service.create(
        'super-1',
        { invitedEmail: 'a@b.tn' },
        {},
        null,
        'https://ecole.klasso.tn',
      );
      expect(result.url.startsWith('https://ecole.klasso.tn/register?token=')).toBe(true);
    });
  });
});
