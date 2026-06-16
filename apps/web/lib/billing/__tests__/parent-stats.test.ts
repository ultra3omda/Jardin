import { describe, it, expect } from 'vitest';
import { computeParentStats } from '../parent-stats';

describe('computeParentStats', () => {
  it('returns zeros for an empty list', () => {
    const s = computeParentStats([]);
    expect(s.totalPaid).toBe(0);
    expect(s.totalPending).toBe(0);
    expect(s.overdueCount).toBe(0);
  });

  it('sums PAID amounts into totalPaid', () => {
    const s = computeParentStats([
      { amount: 100, status: 'PAID' },
      { amount: 50, status: 'PAID' },
    ]);
    expect(s.totalPaid).toBe(150);
    expect(s.totalPending).toBe(0);
  });

  it('sums non-paid/non-cancelled into totalPending and counts overdue', () => {
    const s = computeParentStats([
      { amount: 100, status: 'PENDING' },
      { amount: 40, status: 'OVERDUE' },
      { amount: 999, status: 'CANCELLED' },
    ]);
    expect(s.totalPending).toBe(140);
    expect(s.overdueCount).toBe(1);
    expect(s.totalBilled).toBe(140);
  });
});
