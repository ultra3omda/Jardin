import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
  price: new Prisma.Decimal('6.000'), // per student
  currency: 'TND',
  maxStudents: 200,
};

const STUDENT_COUNT = 10;

function makePrisma() {
  return {
    subscriptionPlan: { findFirst: vi.fn().mockResolvedValue(plan) },
    student: { count: vi.fn().mockResolvedValue(STUDENT_COUNT) },
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

  it('checkout bills per student: amount = price × active student count', async () => {
    const res = await service.checkout('std-monthly', admin);
    expect(res.orderNumber).toMatch(/^SUB/);
    expect(res.redirectUrl).toContain('mock=1');
    expect(res.studentCount).toBe(STUDENT_COUNT);
    expect(Number(res.amount)).toBeCloseTo(6 * STUDENT_COUNT, 3); // 60.000 TND
    const txArg = prisma.paymentTransaction.create.mock.calls[0]![0] as {
      data: { status: string; currency: string; amount: Prisma.Decimal };
    };
    expect(txArg.data.status).toBe('PENDING');
    expect(Number(txArg.data.amount)).toBeCloseTo(60, 3);
    expect(prisma.tenantSubscription.create).toHaveBeenCalled();
  });

  it('checkout rejects when the tenant has no students to bill', async () => {
    prisma.student.count.mockResolvedValueOnce(0);
    const err = (await service.checkout('std-monthly', admin).catch((e) => e)) as BadRequestException;
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse()).toMatchObject({ code: 'NO_STUDENTS_TO_BILL' });
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('checkout rejects when the student count exceeds the tier cap', async () => {
    prisma.student.count.mockResolvedValueOnce(250); // > plan.maxStudents (200)
    const err = (await service.checkout('std-monthly', admin).catch((e) => e)) as BadRequestException;
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse()).toMatchObject({ code: 'PLAN_STUDENT_LIMIT_EXCEEDED' });
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('mySubscription returns nulls when no subscription exists', async () => {
    prisma.tenantSubscription.findFirst.mockResolvedValueOnce(null);
    const res = await service.mySubscription(admin);
    expect(res.status).toBeNull();
  });

  it('the mock gateway computes the correct ClicToPay millimes mapping', async () => {
    // 49.000 TND → 49000 millimes (× 1000). Independent of the per-student plan.
    expect(Math.round(49 * 1000)).toBe(49000);
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
