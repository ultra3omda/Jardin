/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Locale, TenantType, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../common/email/resend.service';
import { InviteTokensService } from './invite-tokens.service';
import { DomainProvisioningService } from './domain-provisioning.service';
import { TenantsService } from './tenants.service';

describe('TenantsService.create', () => {
  let service: TenantsService;
  let prisma: any;
  let inviteTokens: any;
  let resend: any;
  let config: any;
  let domains: any;

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 't1',
          name: 'Demo',
          slug: 'demo',
          type: TenantType.PRIMARY_SCHOOL,
          locale: Locale.fr,
          brand: null,
          createdAt: new Date('2026-05-25'),
          domainStatus: 'NONE',
          customDomain: null,
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ firstName: 'Super', lastName: 'Admin' }),
        findFirst: vi
          .fn()
          .mockResolvedValue({ email: 'admin@demo.fr', emailVerifiedAt: null, lastLoginAt: null }),
        count: vi.fn().mockResolvedValue(1),
      },
      inviteToken: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ consumedAt: null, expiresAt: new Date(Date.now() + 1e9) }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn(async (fn: any) =>
        fn({
          tenant: {
            create: vi.fn().mockResolvedValue({
              id: 't1',
              name: 'Demo',
              slug: 'demo',
              type: TenantType.PRIMARY_SCHOOL,
              locale: Locale.fr,
              brand: null,
              createdAt: new Date(),
            }),
          },
          user: { create: vi.fn().mockResolvedValue({ id: 'u1' }) },
        }),
      ),
    };
    inviteTokens = {
      create: vi.fn().mockResolvedValue({
        id: 'i1',
        token: 'tok-plain',
        url: 'https://web/register?token=tok-plain',
        invitedEmail: 'admin@demo.fr',
        intendedRole: UserRole.SCHOOL_ADMIN,
        expiresAt: '2026-06-08T00:00:00.000Z',
      }),
    };
    resend = { send: vi.fn().mockResolvedValue({ success: true, id: 'r1' }) };
    config = { get: vi.fn().mockImplementation((_k: string, def: unknown) => def) };
    // Flag off by default → legacy path (invite minted, email sent).
    domains = { isEnabled: () => false, provision: vi.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InviteTokensService, useValue: inviteTokens },
        { provide: ResendService, useValue: resend },
        { provide: ConfigService, useValue: config },
        { provide: DomainProvisioningService, useValue: domains },
      ],
    }).compile();
    service = mod.get(TenantsService);
  });

  it('creates tenant + user + invite atomically', async () => {
    const res = await service.create(
      'super-1',
      {
        name: 'Demo',
        slug: 'demo',
        type: TenantType.PRIMARY_SCHOOL,
        adminEmail: 'admin@demo.fr',
        adminFirstName: 'Jean',
        adminLastName: 'Dupont',
      } as any,
      { ip: '127.0.0.1', userAgent: 'test' },
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(inviteTokens.create).toHaveBeenCalled();
    expect(res.invite).not.toBeNull();
    expect(res.invite?.url).toContain('?token=tok-plain');
    expect(res.inviteEmailSent).toBe(true);
    expect(res.domainStatus).toBe('NONE');
  });

  it('rejects reserved slug', async () => {
    await expect(
      service.create(
        'super-1',
        {
          name: 'WWW',
          slug: 'www',
          type: TenantType.PRIMARY_SCHOOL,
          adminEmail: 'a@b.c',
          adminFirstName: 'A',
          adminLastName: 'B',
        } as any,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects when slug already exists', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: 'existing' });
    await expect(
      service.create(
        'super-1',
        {
          name: 'Dup',
          slug: 'demo',
          type: TenantType.PRIMARY_SCHOOL,
          adminEmail: 'a@b.c',
          adminFirstName: 'A',
          adminLastName: 'B',
        } as any,
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('skips email when sendInviteEmail=false', async () => {
    const res = await service.create(
      'super-1',
      {
        name: 'Demo',
        slug: 'silent',
        type: TenantType.PRIMARY_SCHOOL,
        adminEmail: 'admin@silent.fr',
        adminFirstName: 'J',
        adminLastName: 'D',
        sendInviteEmail: false,
      } as any,
      {},
    );
    expect(resend.send).not.toHaveBeenCalled();
    expect(res.inviteEmailSent).toBe(false);
  });

  it('returns inviteEmailSent=false on Resend failure', async () => {
    resend.send.mockResolvedValueOnce({ success: false, error: 'rate-limited' });
    const res = await service.create(
      'super-1',
      {
        name: 'Demo',
        slug: 'fail',
        type: TenantType.PRIMARY_SCHOOL,
        adminEmail: 'admin@fail.fr',
        adminFirstName: 'J',
        adminLastName: 'D',
      } as any,
      {},
    );
    expect(res.inviteEmailSent).toBe(false);
  });

  it('list() excludes seeded demo schools (slug demo-*)', async () => {
    await service.list();
    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, slug: { not: { startsWith: 'demo-' } } },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('TenantsService.retryDomain', () => {
  let service: TenantsService;
  let prisma: any;
  let domains: any;

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'existing-id',
          name: 'Demo',
          slug: 'demo',
          type: TenantType.PRIMARY_SCHOOL,
          locale: Locale.fr,
          brand: null,
          createdAt: new Date('2026-05-25'),
          domainStatus: 'FAILED',
          customDomain: 'demo.klasso.tn',
          deletedAt: null,
        }),
        update: vi.fn().mockResolvedValue({ domainStatus: 'PROVISIONING' }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'existing-id',
          name: 'Demo',
          slug: 'demo',
          type: TenantType.PRIMARY_SCHOOL,
          locale: Locale.fr,
          brand: null,
          createdAt: new Date('2026-05-25'),
          domainStatus: 'PROVISIONING',
          customDomain: 'demo.klasso.tn',
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ firstName: 'Super', lastName: 'Admin' }),
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(1),
      },
      inviteToken: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn(async (fn: any) =>
        fn({
          tenant: { create: vi.fn().mockResolvedValue({ id: 'existing-id', name: 'Demo', slug: 'demo', type: TenantType.PRIMARY_SCHOOL, locale: Locale.fr, brand: null, createdAt: new Date() }) },
          user: { create: vi.fn().mockResolvedValue({ id: 'u1' }) },
        }),
      ),
    };
    domains = { isEnabled: () => true, provision: vi.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InviteTokensService, useValue: { create: vi.fn() } },
        { provide: ResendService, useValue: { send: vi.fn() } },
        { provide: ConfigService, useValue: { get: vi.fn().mockImplementation((_k: string, def: unknown) => def) } },
        { provide: DomainProvisioningService, useValue: domains },
      ],
    }).compile();
    service = mod.get(TenantsService);
  });

  it('retryDomain happy path: updates status to PROVISIONING and calls domains.provision', async () => {
    const result = await service.retryDomain('existing-id', 'super1');

    expect(result).toEqual({ domainStatus: 'PROVISIONING' });
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
      data: { domainStatus: 'PROVISIONING', domainError: null },
    });
    expect(domains.provision).toHaveBeenCalledWith('existing-id', 'super1');
  });

  it('retryDomain throws NotFoundException when tenant not found', async () => {
    prisma.tenant.findFirst.mockResolvedValueOnce(null);

    await expect(service.retryDomain('nonexistent-id', 'super1')).rejects.toThrow(NotFoundException);
    await expect(service.retryDomain('nonexistent-id', 'super1')).rejects.toMatchObject({
      response: { code: 'TENANT_NOT_FOUND' },
    });
  });
});
