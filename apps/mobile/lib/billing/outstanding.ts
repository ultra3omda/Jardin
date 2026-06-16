import type { Invoice } from '../api/billing';

/** Somme des factures non réglées (hors PAID/CANCELLED). */
export function sumOutstanding(items: Pick<Invoice, 'amount' | 'status'>[]): number {
  return items
    .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((acc, i) => acc + i.amount, 0);
}
