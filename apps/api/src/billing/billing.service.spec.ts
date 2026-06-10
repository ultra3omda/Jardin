/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { BillingService } from './billing.service';
import type { CreateInvoiceDto } from './dto/billing.dto';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_A = 'tenant_A';
const TENANT_B = 'tenant_B';

function dec(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function makeInvoice(overrides: Partial<{
  id: string;
  tenantId: string;
  studentId: string | null;
  title: string;
  amount: Prisma.Decimal;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: any[];
  payments: any[];
}> = {}) {
  return {
    id: 'inv_1',
    tenantId: TENANT_A,
    studentId: null,
    title: 'Facture T1',
    amount: dec(350),
    currency: 'TND',
    status: InvoiceStatus.PENDING,
    dueDate: new Date('2025-10-31'),
    paidAt: null,
    notes: null,
    createdAt: new Date('2025-09-01'),
    updatedAt: new Date('2025-09-01'),
    items: [],
    payments: [],
    ...overrides,
  };
}

function makePayment(amount: number, id = 'pay_0') {
  return {
    id,
    invoiceId: 'inv_1',
    amount: dec(amount),
    method: 'cash',
    reference: null,
    notes: null,
    paidAt: new Date(),
  };
}

// ─── Prisma mock ─────────────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    $transaction: vi.fn(),
    invoice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    student: {
      findFirst: vi.fn(),
    },
    parentStudent: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    tenant: {
      findFirst: vi.fn().mockResolvedValue({ name: 'École Démo' }),
    },
    payment: {
      create: vi.fn(),
    },
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('BillingService', () => {
  let service: BillingService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationFanoutService, useValue: { fanoutInvoice: vi.fn() } },
        { provide: InvoicePdfService, useValue: { render: vi.fn().mockResolvedValue(Buffer.from('pdf')) } },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns invoices scoped to tenantId', async () => {
      const inv = makeInvoice();
      prisma.invoice.findMany.mockResolvedValueOnce([inv]);
      prisma.invoice.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_A, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items[0].tenantId).toBe(TENANT_A);
    });

    it('returns empty list when tenant has no invoices', async () => {
      prisma.invoice.findMany.mockResolvedValueOnce([]);
      prisma.invoice.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_B, {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('passes status filter through', async () => {
      const inv = makeInvoice({ status: InvoiceStatus.OVERDUE });
      prisma.invoice.findMany.mockResolvedValueOnce([inv]);
      prisma.invoice.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_A, { status: InvoiceStatus.OVERDUE });

      expect(result.items[0].status).toBe(InvoiceStatus.OVERDUE);
    });

    it('returns correct pagination metadata', async () => {
      prisma.invoice.findMany.mockResolvedValueOnce([]);
      prisma.invoice.count.mockResolvedValueOnce(50);

      const result = await service.findAll(TENANT_A, { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('myInvoices', () => {
    const parentUser = { id: 'u_parent', email: 'p@demo.tn', tenantId: TENANT_A, role: 'PARENT' as const };

    it('returns invoices for the parent children only', async () => {
      prisma.parentStudent.findMany.mockResolvedValueOnce([{ studentId: 's1' }, { studentId: 's2' }]);
      prisma.invoice.findMany.mockResolvedValueOnce([makeInvoice({ studentId: 's1' })]);
      const res = await service.myInvoices(parentUser);
      expect(res.total).toBe(1);
      const where = prisma.invoice.findMany.mock.calls[0][0].where;
      expect(where.studentId).toEqual({ in: ['s1', 's2'] });
      expect(where.tenantId).toBe(TENANT_A);
    });

    it('short-circuits to empty when the parent has no children', async () => {
      prisma.parentStudent.findMany.mockResolvedValueOnce([]);
      const res = await service.myInvoices(parentUser);
      expect(res).toEqual({ items: [], total: 0, page: 1, limit: 0 });
      expect(prisma.invoice.findMany).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const baseDto: CreateInvoiceDto = {
      title: 'Facture T1 2025-2026',
      dueDate: '2025-10-31',
      items: [{ label: 'Frais de scolarité', quantity: 1, unitPrice: 350 }],
    };

    it('creates invoice with PENDING status and correct amount', async () => {
      const created = makeInvoice({
        amount: dec(350),
        items: [
          {
            id: 'item_1',
            invoiceId: 'inv_1',
            label: 'Frais de scolarité',
            quantity: 1,
            unitPrice: dec(350),
            amount: dec(350),
          },
        ],
      });

      prisma.$transaction.mockImplementationOnce(
        async (fn: (tx: any) => Promise<any>) => fn(prisma),
      );
      prisma.invoice.create.mockResolvedValueOnce(created);

      const result = await service.create(TENANT_A, baseDto);

      expect(result.amount).toBe(350);
      expect(result.status).toBe(InvoiceStatus.PENDING);
      expect(result.tenantId).toBe(TENANT_A);
    });

    it('sums multiple items into total invoice amount', async () => {
      // 200 * 1 + 50 * 2 = 300
      const dto: CreateInvoiceDto = {
        title: 'Facture multi',
        dueDate: '2025-10-31',
        items: [
          { label: 'Frais T1', quantity: 1, unitPrice: 200 },
          { label: 'Transport', quantity: 2, unitPrice: 50 },
        ],
      };
      prisma.$transaction.mockImplementationOnce(
        async (fn: (tx: any) => Promise<any>) => fn(prisma),
      );
      prisma.invoice.create.mockResolvedValueOnce(makeInvoice({ amount: dec(300) }));

      const result = await service.create(TENANT_A, dto);

      expect(result.amount).toBe(300);
    });

    it('throws BadRequestException when items array is empty', async () => {
      await expect(service.create(TENANT_A, { ...baseDto, items: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when studentId not found in tenant', async () => {
      prisma.student.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create(TENANT_A, { ...baseDto, studentId: 'stu_unknown' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── recordPayment ─────────────────────────────────────────────────────────

  describe('recordPayment', () => {
    it('sets status to PARTIAL when payment covers less than invoice amount', async () => {
      prisma.invoice.findFirst.mockResolvedValueOnce(
        makeInvoice({ amount: dec(350), payments: [] }),
      );

      const updatedInv = makeInvoice({
        status: InvoiceStatus.PARTIAL,
        payments: [makePayment(175)],
      });

      prisma.$transaction.mockImplementationOnce(
        async (fn: (tx: any) => Promise<any>) => fn(prisma),
      );
      prisma.payment.create.mockResolvedValueOnce({});
      prisma.invoice.update.mockResolvedValueOnce(updatedInv);

      const result = await service.recordPayment(TENANT_A, 'inv_1', {
        amount: 175,
        method: 'cash',
      });

      expect(result.status).toBe(InvoiceStatus.PARTIAL);
      expect(prisma.invoice.update.mock.calls[0][0].data.status).toBe(InvoiceStatus.PARTIAL);
    });

    it('sets status to PAID and stamps paidAt when payment covers full amount', async () => {
      prisma.invoice.findFirst.mockResolvedValueOnce(
        makeInvoice({ amount: dec(350), payments: [] }),
      );

      const paidAt = new Date();
      const updatedInv = makeInvoice({
        status: InvoiceStatus.PAID,
        paidAt,
        payments: [makePayment(350)],
      });

      prisma.$transaction.mockImplementationOnce(
        async (fn: (tx: any) => Promise<any>) => fn(prisma),
      );
      prisma.payment.create.mockResolvedValueOnce({});
      prisma.invoice.update.mockResolvedValueOnce(updatedInv);

      const result = await service.recordPayment(TENANT_A, 'inv_1', {
        amount: 350,
        method: 'bank_transfer',
      });

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(result.paidAt).not.toBeNull();
      expect(prisma.invoice.update.mock.calls[0][0].data.status).toBe(InvoiceStatus.PAID);
    });

    it('accumulates prior payments — stays PARTIAL when total still below amount', async () => {
      // Existing: 100, new: 100, total: 200 < 350 → PARTIAL
      prisma.invoice.findFirst.mockResolvedValueOnce(
        makeInvoice({ amount: dec(350), payments: [makePayment(100)] }),
      );

      prisma.$transaction.mockImplementationOnce(
        async (fn: (tx: any) => Promise<any>) => fn(prisma),
      );
      prisma.payment.create.mockResolvedValueOnce({});
      prisma.invoice.update.mockResolvedValueOnce(makeInvoice({ status: InvoiceStatus.PARTIAL }));

      const result = await service.recordPayment(TENANT_A, 'inv_1', {
        amount: 100,
        method: 'cash',
      });

      expect(result.status).toBe(InvoiceStatus.PARTIAL);
    });

    it('throws NotFoundException when invoice belongs to a different tenant', async () => {
      prisma.invoice.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.recordPayment(TENANT_B, 'inv_1', { amount: 175, method: 'cash' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when invoice is CANCELLED', async () => {
      prisma.invoice.findFirst.mockResolvedValueOnce(
        makeInvoice({ status: InvoiceStatus.CANCELLED }),
      );

      await expect(
        service.recordPayment(TENANT_A, 'inv_1', { amount: 175, method: 'cash' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getDashboardStats ─────────────────────────────────────────────────────

  describe('getDashboardStats', () => {
    it('returns correct numeric shape from aggregate results', async () => {
      prisma.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { amount: dec(1000) } })
        .mockResolvedValueOnce({ _sum: { amount: dec(600) } })
        .mockResolvedValueOnce({ _sum: { amount: dec(300) }, _count: { id: 3 } })
        .mockResolvedValueOnce({ _sum: { amount: dec(100) }, _count: { id: 1 } });

      const stats = await service.getDashboardStats(TENANT_A);

      expect(stats).toEqual({
        totalBilled: 1000,
        totalPaid: 600,
        totalPending: 300,
        totalOverdue: 100,
        pendingCount: 3,
        overdueCount: 1,
      });
    });

    it('returns zeros when no invoices exist', async () => {
      prisma.invoice.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: { id: 0 } });

      const stats = await service.getDashboardStats(TENANT_A);

      expect(stats.totalBilled).toBe(0);
      expect(stats.totalPaid).toBe(0);
      expect(stats.totalPending).toBe(0);
      expect(stats.totalOverdue).toBe(0);
      expect(stats.overdueCount).toBe(0);
      expect(stats.pendingCount).toBe(0);
    });

    it('scopes all aggregate queries to the given tenantId', async () => {
      prisma.invoice.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: { id: 0 } });

      await service.getDashboardStats(TENANT_B);

      prisma.invoice.aggregate.mock.calls.forEach((call: any[]) => {
        expect((call[0] as { where: { tenantId: string } }).where.tenantId).toBe(TENANT_B);
      });
    });
  });

  // ─── getInvoicePdf ───────────────────────────────────────────────────────────

  describe('getInvoicePdf', () => {
    const admin = { id: 'admin_1', email: 'a@t.test', tenantId: TENANT_A, role: 'SCHOOL_ADMIN' } as any;
    const parent = { id: 'parent_1', email: 'p@t.test', tenantId: TENANT_A, role: 'PARENT' } as any;

    it('renders a PDF for a SCHOOL_ADMIN and bills the balance correctly', async () => {
      prisma.invoice.findFirst.mockResolvedValueOnce(
        makeInvoice({
          amount: dec(350),
          payments: [makePayment(100)],
          student: { id: 'stu_1', firstName: 'Salma', lastName: 'Ben Ali' },
        } as any),
      );
      const pdfService = (service as any).invoicePdf as { render: ReturnType<typeof vi.fn> };

      const buf = await service.getInvoicePdf(TENANT_A, 'inv_1', admin);

      expect(Buffer.isBuffer(buf)).toBe(true);
      const props = pdfService.render.mock.calls[0]![0];
      expect(props.total).toBe(350);
      expect(props.paidTotal).toBe(100);
      expect(props.balance).toBe(250);
      expect(props.billedToName).toBe('Salma Ben Ali');
      expect(props.schoolName).toBe('École Démo');
    });

    it('throws NotFound for an invoice outside the tenant', async () => {
      prisma.invoice.findFirst.mockResolvedValueOnce(null);
      await expect(service.getInvoicePdf(TENANT_A, 'inv_x', admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('forbids a PARENT from downloading an invoice that is not their child’s', async () => {
      prisma.invoice.findFirst.mockResolvedValueOnce(
        makeInvoice({ studentId: 'someone_elses_kid' } as any),
      );
      prisma.parentStudent.count.mockResolvedValueOnce(0); // not linked
      const err = await service.getInvoicePdf(TENANT_A, 'inv_1', parent).catch((e) => e);
      expect(err?.getResponse?.().code).toBe('NOT_YOUR_INVOICE');
    });

    it('lets a PARENT download their own child’s invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValueOnce(
        makeInvoice({
          studentId: 'my_kid',
          student: { id: 'my_kid', firstName: 'Omar', lastName: 'K.' },
        } as any),
      );
      prisma.parentStudent.count.mockResolvedValueOnce(1); // linked
      const buf = await service.getInvoicePdf(TENANT_A, 'inv_1', parent);
      expect(Buffer.isBuffer(buf)).toBe(true);
    });
  });
});
