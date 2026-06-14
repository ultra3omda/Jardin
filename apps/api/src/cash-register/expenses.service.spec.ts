import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ExpensesService } from './expenses.service';

const TENANT = 't_demo';

function buildPrismaMock() {
  return {
    supplier: { findFirst: vi.fn(), update: vi.fn() },
    expense: { findFirst: vi.fn(), update: vi.fn() },
    cashMovement: { findFirst: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('ExpensesService — édition & suppression', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: ExpensesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ExpensesService(prisma as any);
  });

  it('updateSupplier throws NotFound when missing', async () => {
    prisma.supplier.findFirst.mockResolvedValue(null);
    await expect(service.updateSupplier(TENANT, 's1', { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updateSupplier updates an existing supplier', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 's1' });
    prisma.supplier.update.mockResolvedValue({ id: 's1', name: 'X' });
    const res = await service.updateSupplier(TENANT, 's1', { name: 'X' });
    expect(prisma.supplier.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { name: 'X' } });
    expect(res.name).toBe('X');
  });

  it('updateExpense edits metadata only (no amount/method)', async () => {
    prisma.expense.findFirst.mockResolvedValue({ id: 'e1' });
    prisma.expense.update.mockResolvedValue({ id: 'e1' });
    await service.updateExpense(TENANT, 'e1', { category: 'Fournitures', paidAt: '2026-01-10' });
    const arg = prisma.expense.update.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(arg.data.category).toBe('Fournitures');
    expect(arg.data).not.toHaveProperty('amount');
    expect(arg.data).not.toHaveProperty('method');
  });

  it('deleteExpense soft-deletes a non-cash expense (no linked movement)', async () => {
    prisma.expense.findFirst.mockResolvedValue({ id: 'e1' });
    prisma.cashMovement.findFirst.mockResolvedValue(null);
    prisma.expense.update.mockResolvedValue({ id: 'e1' });
    await service.deleteExpense(TENANT, 'e1');
    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(prisma.cashMovement.delete).not.toHaveBeenCalled();
  });

  it('deleteExpense reverses the linked movement when the session is OPEN', async () => {
    prisma.expense.findFirst.mockResolvedValue({ id: 'e1' });
    prisma.cashMovement.findFirst.mockResolvedValue({ id: 'm1', session: { status: 'OPEN' } });
    prisma.cashMovement.delete.mockResolvedValue({ id: 'm1' });
    prisma.expense.update.mockResolvedValue({ id: 'e1' });
    await service.deleteExpense(TENANT, 'e1');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.cashMovement.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('deleteExpense is blocked when the linked session is CLOSED', async () => {
    prisma.expense.findFirst.mockResolvedValue({ id: 'e1' });
    prisma.cashMovement.findFirst.mockResolvedValue({ id: 'm1', session: { status: 'CLOSED' } });
    await expect(service.deleteExpense(TENANT, 'e1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.cashMovement.delete).not.toHaveBeenCalled();
  });

  it('deleteExpense throws NotFound when missing', async () => {
    prisma.expense.findFirst.mockResolvedValue(null);
    await expect(service.deleteExpense(TENANT, 'eX')).rejects.toBeInstanceOf(NotFoundException);
  });
});
