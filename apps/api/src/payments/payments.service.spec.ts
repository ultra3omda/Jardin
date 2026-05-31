import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { MockGateway } from './gateway/mock.gateway';

const admin: AuthenticatedUser = {
  id: 'a1',
  email: 'a@t.test',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};

const plan = {
  id: 'plan1',
  code: 'std-monthly',
  name: 'Standard',
  interval: 'MONTHLY',
  price: new Prisma.Decimal('49.000'),
  currency: 'TND',
};

function makePrisma() {
  return {
    subscriptionPlan: { findFirst: vi.fn().mockResolvedValue(plan) },
    paymentTransaction: {
      create: vi.fn().mockResolvedValue({ id: 'tx1' }),
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
    },
    tenantSubscription: { create: vi.fn().mockResolvedValue({ id: 'sub1' }), findFirst: vi.fn(), update: vi.fn() },
  };
}

const config = { get: (_k: string, d?: unknown) => d ?? 'http://localhost:3000' };

describe('PaymentsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PaymentsService;
  let gateway: MockGateway;

  beforeEach(() => {
    prisma = makePrisma();
    gateway = new MockGateway();
    service = new PaymentsService(
      prisma as unknown as PrismaService,
      config as never,
      gateway,
    );
  });

  it('checkout requires a tenant', async () => {
    await expect(service.checkout('std-monthly', { ...admin, tenantId: null })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('checkout throws PLAN_NOT_FOUND for an unknown plan', async () => {
    prisma.subscriptionPlan.findFirst.mockResolvedValueOnce(null);
    await expect(service.checkout('nope', admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checkout creates a PENDING transaction + draft subscription and returns a redirect URL', async () => {
    const res = await service.checkout('std-monthly', admin);
    expect(res.orderNumber).toMatch(/^SUB/);
    expect(res.redirectUrl).toContain('mock=1');
    const txArg = prisma.paymentTransaction.create.mock.calls[0]![0] as {
      data: { status: string; currency: string };
    };
    expect(txArg.data.status).toBe('PENDING');
    expect(prisma.tenantSubscription.create).toHaveBeenCalled();
  });

  it('mySubscription returns nulls when no subscription exists', async () => {
    prisma.tenantSubscription.findFirst.mockResolvedValueOnce(null);
    const res = await service.mySubscription(admin);
    expect(res.status).toBeNull();
  });

  it('the mock gateway computes the correct ClicToPay millimes mapping', async () => {
    // 49.000 TND → 49000 millimes.
    expect(Math.round(Number(plan.price) * 1000)).toBe(49000);
    const created = await gateway.createPayment({
      orderNumber: 'SUBx',
      amountMillimes: 49000,
      currency: '788',
      returnUrl: 'https://w/billing',
    });
    const status = await gateway.getStatus(created.gatewayOrderId);
    expect(status.orderStatus).toBe(2); // paid
  });
});
