import { Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { CashMovementKind, CashSessionStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { CreateExpenseDto, CreateSupplierDto } from './dto/cash-register.dto';

/**
 * G1 — Dépenses & fournisseurs. Une dépense réglée en espèces sur une session
 * de caisse ouverte crée automatiquement un mouvement EXPENSE.
 */
@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Suppliers ───────────────────────────────────────────────────────────

  listSuppliers(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  createSupplier(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { id: createId(), tenantId, ...dto } });
  }

  async deleteSupplier(tenantId: string, id: string) {
    const s = await this.prisma.supplier.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!s) throw new NotFoundException('Supplier not found');
    await this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ─── Expenses ────────────────────────────────────────────────────────────

  listExpenses(tenantId: string, filters: { category?: string; supplierId?: string }) {
    return this.prisma.expense.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  async createExpense(tenantId: string, userId: string, dto: CreateExpenseDto) {
    const expenseId = createId();
    const expense = await this.prisma.expense.create({
      data: {
        id: expenseId,
        tenantId,
        supplierId: dto.supplierId ?? null,
        category: dto.category,
        amount: dto.amount,
        paidAt: new Date(dto.paidAt),
        method: dto.method,
        reference: dto.reference ?? null,
        recordedById: userId,
      },
    });

    // Auto-mouvement de caisse si dépense espèce et session ouverte.
    if (dto.method === 'cash') {
      const session = await this.prisma.cashRegisterSession.findFirst({
        where: { tenantId, status: CashSessionStatus.OPEN },
      });
      if (session) {
        await this.prisma.cashMovement.create({
          data: {
            id: createId(),
            tenantId,
            sessionId: session.id,
            kind: CashMovementKind.EXPENSE,
            amount: dto.amount,
            label: `Dépense: ${dto.category}`,
            expenseId,
            createdById: userId,
          },
        });
      }
    }
    return expense;
  }
}
