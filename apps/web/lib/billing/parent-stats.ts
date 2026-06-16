import type { BillingStats, Invoice } from '@/lib/api/billing';

/** KPIs parent dérivés des factures de ses enfants (pas d'endpoint /stats admin). */
export function computeParentStats(items: Pick<Invoice, 'amount' | 'status'>[]): BillingStats {
  let totalPaid = 0;
  let totalDue = 0;
  let overdueCount = 0;
  for (const i of items) {
    if (i.status === 'PAID') totalPaid += i.amount;
    else if (i.status === 'CANCELLED') continue;
    else {
      totalDue += i.amount;
      if (i.status === 'OVERDUE') overdueCount += 1;
    }
  }
  return {
    totalBilled: totalPaid + totalDue,
    totalPaid,
    totalPending: totalDue,
    totalOverdue: 0,
    overdueCount,
    pendingCount: 0,
  };
}
