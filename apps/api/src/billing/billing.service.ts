import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { InvoiceStatus, Prisma, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import { InvoicePdfService } from './invoice-pdf.service';

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: 'En attente',
  PARTIAL: 'Partiellement payée',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
};
import type {
  BillingDashboardStatsDto,
  CreateInvoiceDto,
  InvoiceItemResponseDto,
  InvoiceResponseDto,
  InvoiceQueryDto,
  ListInvoicesResponseDto,
  PaymentResponseDto,
  RecordPaymentDto,
  UpdateInvoiceDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
    private readonly invoicePdf: InvoicePdfService,
  ) {}

  // ───── PDF ─────

  /**
   * Render a branded invoice PDF. SCHOOL_ADMIN can fetch any invoice in their
   * tenant; a PARENT may only fetch an invoice billed to one of their own
   * children (tenant-scoped + ownership-checked).
   */
  async getInvoicePdf(tenantId: string, id: string, user: AuthenticatedUser): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        payments: true,
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND' });

    if (user.role === UserRole.PARENT) {
      const isOwnChild =
        invoice.studentId !== null &&
        (await this.prisma.parentStudent.count({
          where: { tenantId, parentUserId: user.id, studentId: invoice.studentId },
        })) > 0;
      if (!isOwnChild) throw new ForbiddenException({ code: 'NOT_YOUR_INVOICE' });
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { name: true },
    });

    const total = Number(invoice.amount);
    const paidTotal = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const billedToName = invoice.student
      ? `${invoice.student.firstName} ${invoice.student.lastName}`.trim()
      : null;

    return this.invoicePdf.render({
      schoolName: tenant?.name ?? 'Établissement',
      invoiceNumber: `FAC-${invoice.id.slice(-8).toUpperCase()}`,
      title: invoice.title,
      statusLabel: INVOICE_STATUS_LABELS[invoice.status],
      currency: invoice.currency,
      issueDate: invoice.createdAt.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      billedToName,
      items: invoice.items.map((it) => ({
        label: it.label,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        amount: Number(it.amount),
      })),
      total,
      paidTotal,
      balance: Math.max(0, total - paidTotal),
      notes: invoice.notes,
      generatedAt: new Date().toISOString(),
    });
  }

  // ───── Queries ─────

  /**
   * Lot démo parent — factures rattachées aux enfants du parent connecté
   * (lecture seule ; le paiement en ligne arrive en Vague 7).
   */
  async myInvoices(user: AuthenticatedUser): Promise<ListInvoicesResponseDto> {
    if (!user.tenantId) return { items: [], total: 0, page: 1, limit: 0 };
    const links = await this.prisma.parentStudent.findMany({
      where: { parentUserId: user.id, tenantId: user.tenantId },
      select: { studentId: true },
    });
    const childIds = links.map((l) => l.studentId);
    if (childIds.length === 0) return { items: [], total: 0, page: 1, limit: 0 };

    const items = await this.prisma.invoice.findMany({
      where: { tenantId: user.tenantId, studentId: { in: childIds } },
      include: { items: true, payments: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    return {
      items: items.map((inv) => this.toInvoiceResponse(inv)),
      total: items.length,
      page: 1,
      limit: items.length,
    };
  }

  async findAll(tenantId: string, query: InvoiceQueryDto): Promise<ListInvoicesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          items: true,
          payments: true,
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: items.map((inv) => this.toInvoiceResponse(inv)),
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        payments: true,
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND' });
    return this.toInvoiceResponse(invoice);
  }

  // ───── Mutations ─────

  async create(tenantId: string, dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException({ code: 'INVOICE_ITEMS_REQUIRED' });
    }

    if (dto.studentId) {
      const student = await this.prisma.student.findFirst({
        where: { id: dto.studentId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    }

    // Compute item amounts and invoice total
    const itemsWithAmounts = dto.items.map((item) => ({
      id: createId(),
      label: item.label,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(item.unitPrice),
      amount: new Prisma.Decimal(item.unitPrice * item.quantity),
    }));
    const invoiceAmount = itemsWithAmounts.reduce(
      (sum, item) => sum.add(item.amount),
      new Prisma.Decimal(0),
    );

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.invoice.create({
        data: {
          id: createId(),
          tenantId,
          studentId: dto.studentId ?? null,
          title: dto.title,
          amount: invoiceAmount,
          currency: dto.currency ?? 'TND',
          status: InvoiceStatus.PENDING,
          dueDate: new Date(dto.dueDate),
          notes: dto.notes ?? null,
          items: {
            create: itemsWithAmounts,
          },
        },
        include: { items: true, payments: true },
      });
    });

    // V10 — notify the student's parents of the new invoice. Fire-and-forget.
    if (dto.studentId) {
      void this.fanoutInvoiceNotification(tenantId, dto.studentId, Number(invoiceAmount));
    }

    return this.toInvoiceResponse(created);
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto): Promise<InvoiceResponseDto> {
    const existing = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND' });

    const paidAt =
      dto.status === InvoiceStatus.PAID && existing.paidAt === null
        ? new Date()
        : undefined;

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(paidAt !== undefined ? { paidAt } : {}),
      },
      include: { items: true, payments: true },
    });

    return this.toInvoiceResponse(updated);
  }

  async recordPayment(
    tenantId: string,
    invoiceId: string,
    dto: RecordPaymentDto,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { payments: true },
    });
    if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND' });

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException({ code: 'INVOICE_CANCELLED' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const paymentId = createId();
      await tx.payment.create({
        data: {
          id: paymentId,
          invoiceId,
          amount: new Prisma.Decimal(dto.amount),
          method: dto.method,
          reference: dto.reference ?? null,
          notes: dto.notes ?? null,
        },
      });

      // G1 — encaissement espèce rattaché à la session de caisse ouverte (si présente).
      // Attribué à l'ouvreur de la caisse (recordPayment n'a pas l'utilisateur courant).
      if (dto.method === 'cash') {
        const session = await tx.cashRegisterSession.findFirst({
          where: { tenantId, status: 'OPEN' },
        });
        if (session) {
          await tx.cashMovement.create({
            data: {
              id: createId(),
              tenantId,
              sessionId: session.id,
              kind: 'INCOME',
              amount: new Prisma.Decimal(dto.amount),
              label: 'Encaissement facture',
              paymentId,
              createdById: session.openedById,
            },
          });
          await tx.payment.update({
            where: { id: paymentId },
            data: { cashSessionId: session.id },
          });
        }
      }

      // Recalculate total paid (existing payments + new payment)
      const existingPaidSum = invoice.payments.reduce(
        (sum, p) => sum.add(p.amount),
        new Prisma.Decimal(0),
      );
      const newTotalPaid = existingPaidSum.add(new Prisma.Decimal(dto.amount));
      const invoiceAmount = invoice.amount;

      let newStatus: InvoiceStatus;
      let paidAt: Date | null = invoice.paidAt;

      if (newTotalPaid.greaterThanOrEqualTo(invoiceAmount)) {
        newStatus = InvoiceStatus.PAID;
        paidAt = paidAt ?? new Date();
      } else {
        newStatus = InvoiceStatus.PARTIAL;
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus, paidAt },
        include: { items: true, payments: true },
      });
    });

    return this.toInvoiceResponse(updated);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND' });

    await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });
  }

  // ───── Dashboard Stats ─────

  async getDashboardStats(tenantId: string): Promise<BillingDashboardStatsDto> {
    const [allInvoices, paidInvoices, pendingInvoices, overdueInvoices] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { tenantId, status: { not: InvoiceStatus.CANCELLED } },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, status: InvoiceStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, status: InvoiceStatus.OVERDUE },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalBilled: Number(allInvoices._sum.amount ?? 0),
      totalPaid: Number(paidInvoices._sum.amount ?? 0),
      totalPending: Number(pendingInvoices._sum.amount ?? 0),
      totalOverdue: Number(overdueInvoices._sum.amount ?? 0),
      overdueCount: overdueInvoices._count.id ?? 0,
      pendingCount: pendingInvoices._count.id ?? 0,
    };
  }

  // ───── Private mappers ─────

  /**
   * V10 — Fan-out an invoice notification to each parent of the billed student.
   * Fire-and-forget; never blocks invoice creation.
   */
  private async fanoutInvoiceNotification(
    tenantId: string,
    studentId: string,
    amount: number,
  ): Promise<void> {
    const parents = await this.prisma.parentStudent.findMany({
      where: { tenantId, studentId },
      select: { parentUserId: true },
    });
    if (parents.length === 0) return;
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
      select: { firstName: true, lastName: true },
    });
    if (!student) return;
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    await Promise.allSettled(
      parents.map((p) =>
        this.fanout.fanoutInvoice(tenantId, p.parentUserId, studentName, amount),
      ),
    );
  }

  private toInvoiceResponse(inv: {
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
    items?: Array<{
      id: string;
      invoiceId: string;
      label: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      amount: Prisma.Decimal;
    }>;
    payments?: Array<{
      id: string;
      invoiceId: string;
      amount: Prisma.Decimal;
      method: string;
      reference: string | null;
      notes: string | null;
      paidAt: Date;
    }>;
  }): InvoiceResponseDto {
    return {
      id: inv.id,
      tenantId: inv.tenantId,
      studentId: inv.studentId,
      title: inv.title,
      amount: Number(inv.amount),
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      notes: inv.notes,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      ...(inv.items !== undefined
        ? { items: inv.items.map((item) => this.toItemResponse(item)) }
        : {}),
      ...(inv.payments !== undefined
        ? { payments: inv.payments.map((p) => this.toPaymentResponse(p)) }
        : {}),
    };
  }

  private toItemResponse(item: {
    id: string;
    invoiceId: string;
    label: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    amount: Prisma.Decimal;
  }): InvoiceItemResponseDto {
    return {
      id: item.id,
      invoiceId: item.invoiceId,
      label: item.label,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
    };
  }

  private toPaymentResponse(p: {
    id: string;
    invoiceId: string;
    amount: Prisma.Decimal;
    method: string;
    reference: string | null;
    notes: string | null;
    paidAt: Date;
  }): PaymentResponseDto {
    return {
      id: p.id,
      invoiceId: p.invoiceId,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      paidAt: p.paidAt,
    };
  }
}
