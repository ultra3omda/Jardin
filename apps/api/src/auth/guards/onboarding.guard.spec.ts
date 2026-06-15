import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import { OnboardingGuard } from './onboarding.guard';

interface FakeReq {
  user?: { id: string; email: string; tenantId: string | null; role: UserRole };
  method: string;
}

function ctxFor(req: FakeReq): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const admin = (over: Partial<FakeReq['user']> = {}): FakeReq['user'] => ({
  id: 'u1',
  email: 'admin@ecole.tn',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
  ...over,
});

describe('OnboardingGuard', () => {
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let prisma: { tenant: { findUnique: ReturnType<typeof vi.fn> } };
  let guard: OnboardingGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    prisma = { tenant: { findUnique: vi.fn() } };
    guard = new OnboardingGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('passes allow-listed routes without touching the DB', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(ctxFor({ user: admin(), method: 'POST' }))).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('passes unauthenticated (public) requests', async () => {
    await expect(guard.canActivate(ctxFor({ method: 'POST' }))).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('does not gate non-admin roles', async () => {
    await expect(
      guard.canActivate(ctxFor({ user: admin({ role: UserRole.TEACHER }), method: 'POST' })),
    ).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('does not gate a platform admin without a tenant', async () => {
    await expect(
      guard.canActivate(
        ctxFor({ user: admin({ role: UserRole.SUPER_ADMIN, tenantId: null }), method: 'POST' }),
      ),
    ).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('always allows reads (GET) without a DB lookup', async () => {
    await expect(guard.canActivate(ctxFor({ user: admin(), method: 'GET' }))).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('blocks a SCHOOL_ADMIN write while the org is PENDING_ONBOARDING', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ status: 'PENDING_ONBOARDING' });
    await expect(
      guard.canActivate(ctxFor({ user: admin(), method: 'POST' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a SCHOOL_ADMIN write once the org is ACTIVE', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    await expect(guard.canActivate(ctxFor({ user: admin(), method: 'POST' }))).resolves.toBe(true);
  });

  it('does not 403 when the tenant cannot be found (lets the handler decide)', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(ctxFor({ user: admin(), method: 'PATCH' }))).resolves.toBe(true);
  });
});
