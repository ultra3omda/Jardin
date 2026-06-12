import { describe, it, expect } from 'vitest';

import { computeExpected, computeVariance } from './cash-register.util';

describe('cash-register util', () => {
  it('expected = floor + income - expense', () => {
    expect(
      computeExpected(100, [
        { kind: 'INCOME', amount: 520 },
        { kind: 'INCOME', amount: 630 },
        { kind: 'EXPENSE', amount: 50 },
      ]),
    ).toBe(1200);
  });

  it('variance = compté - attendu (millime)', () => {
    expect(computeVariance(1200, 1199.5)).toBeCloseTo(-0.5, 3);
  });

  it('expected sans mouvement = floor', () => {
    expect(computeExpected(80, [])).toBe(80);
  });

  it('arrondit au millime', () => {
    expect(
      computeExpected(0, [
        { kind: 'INCOME', amount: 33.333 },
        { kind: 'INCOME', amount: 33.333 },
        { kind: 'INCOME', amount: 33.334 },
      ]),
    ).toBe(100);
  });
});
