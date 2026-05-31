import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { PayrollService, computePayslipTotals } from './payroll.service';

const admin: AuthenticatedUser = {
  id: 'admin1',
  email: 'admin@t.test',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};
const teacher: AuthenticatedUser = {
  id: 'teach1',
  email: 'teach@t.test',
  tenantId: 't1',
  role: UserRole.TEACHER,
};

const D = (v: string | number) => new Prisma.Decimal(v);

const payslipRow = {
  id: 'p1',
  tenantId: 't1',
  userId: 'teach1',
  period: '2026-05',
  baseSalary: D('2200.000'),
  grossSalary: D('2200.000'),
  totalDeductions: D('0.000'),
  netSalary: D('2200.000'),
  currency: 'TND',
  status: 'DRAFT',
  issuedAt: null,
  notes: null,
  components: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrisma() {
  return {
    payslip: {
      create: vi.fn().mockResolvedValue(payslipRow),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    payslipComponent: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    employmentContract: { findFirst: vi.fn() },
  };
}

describe('computePayslipTotals', () => {
  it('gross = base + earnings, net = gross − deductions', () => {
    const totals = computePayslipTotals(D('2000'), [
      { kind: 'EARNING', amount: D('150') },
      { kind: 'DEDUCTION', amount: D('80.5') },
    ]);
    expect(totals.grossSalary.toString()).toBe('2150');
    expect(totals.totalDeductions.toString()).toBe('80.5');
    expect(totals.netSalary.toString()).toBe('2069.5');
  });

  it('no components → gross = net = base', () => {
    const totals = computePayslipTotals(D('1800'), []);
    expect(totals.grossSalary.toString()).toBe('1800');
    expect(totals.netSalary.toString()).toBe('1800');
    expect(totals.totalDeductions.toString()).toBe('0');
  });
});

describe('PayrollService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PayrollService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PayrollService(prisma as unknown as PrismaService);
  });

  it('generate requires an active contract (400 otherwise)', async () => {
    prisma.employmentContract.findFirst.mockResolvedValueOnce(null);
    await expect(service.generate({ userId: 'teach1', period: '2026-05' }, admin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('generate rejects a duplicate period (409)', async () => {
    prisma.employmentContract.findFirst.mockResolvedValueOnce({ baseSalary: D('2200'), currency: 'TND' });
    prisma.payslip.findFirst.mockResolvedValueOnce({ id: 'existing' });
    await expect(service.generate({ userId: 'teach1', period: '2026-05' }, admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('generate computes base = gross = net from the active contract', async () => {
    prisma.employmentContract.findFirst.mockResolvedValueOnce({ baseSalary: D('2200'), currency: 'TND' });
    prisma.payslip.findFirst.mockResolvedValueOnce(null);
    const res = await service.generate({ userId: 'teach1', period: '2026-05' }, admin);
    expect(res.netSalary).toBe('2200');
    const arg = prisma.payslip.create.mock.calls[0]![0] as {
      data: { grossSalary: Prisma.Decimal; netSalary: Prisma.Decimal };
    };
    expect(arg.data.grossSalary.toString()).toBe('2200');
  });

  it('a teacher cannot generate (403)', async () => {
    await expect(service.generate({ userId: 'teach1', period: '2026-05' }, teacher)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('list confines a teacher to their own userId', async () => {
    await service.list({ userId: 'other' }, teacher);
    const arg = prisma.payslip.findMany.mock.calls[0]![0] as { where: { userId: string } };
    expect(arg.where.userId).toBe('teach1');
  });

  it('a teacher reading another payslip gets NotFound', async () => {
    prisma.payslip.findFirst.mockResolvedValueOnce({ ...payslipRow, userId: 'other' });
    await expect(service.getById('p1', teacher)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cannot add a component to an ISSUED payslip (400)', async () => {
    prisma.payslip.findFirst.mockResolvedValueOnce({ ...payslipRow, status: 'ISSUED' });
    await expect(
      service.addComponent('p1', { label: 'Prime', kind: 'EARNING', amount: 100 }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('issue sets status ISSUED + issuedAt', async () => {
    prisma.payslip.findFirst.mockResolvedValueOnce(payslipRow);
    prisma.payslip.update.mockResolvedValueOnce({ ...payslipRow, status: 'ISSUED', issuedAt: new Date() });
    const res = await service.issue('p1', admin);
    expect(res.status).toBe('ISSUED');
    const arg = prisma.payslip.update.mock.calls[0]![0] as {
      data: { status: string; issuedAt: Date };
    };
    expect(arg.data.status).toBe('ISSUED');
    expect(arg.data.issuedAt).toBeInstanceOf(Date);
  });
});
