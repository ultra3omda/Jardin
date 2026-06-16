import { sumOutstanding } from '../outstanding';

describe('sumOutstanding', () => {
  it('sums PENDING/OVERDUE/PARTIAL amounts', () => {
    expect(
      sumOutstanding([
        { amount: 100, status: 'PENDING' },
        { amount: 50, status: 'OVERDUE' },
        { amount: 30, status: 'PARTIAL' },
      ]),
    ).toBe(180);
  });

  it('excludes PAID and CANCELLED', () => {
    expect(
      sumOutstanding([
        { amount: 100, status: 'PAID' },
        { amount: 999, status: 'CANCELLED' },
        { amount: 20, status: 'PENDING' },
      ]),
    ).toBe(20);
  });

  it('returns 0 for an empty list', () => {
    expect(sumOutstanding([])).toBe(0);
  });
});
