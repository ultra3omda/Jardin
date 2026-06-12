import { describe, it, expect } from 'vitest';

import { splitInstallments, deriveAssignmentStatus } from './fee-installment.util';

describe('splitInstallments', () => {
  it('répartit un montant exact sans reliquat', () => {
    const parts = splitInstallments(900, 3); // 900.000 / 3
    expect(parts).toEqual([300, 300, 300]);
  });

  it('met le reliquat de millimes sur la dernière tranche', () => {
    const parts = splitInstallments(100, 3); // 33.333 + 33.333 + 33.334
    expect(parts).toEqual([33.333, 33.333, 33.334]);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 3);
  });

  it("soustrait l'avance avant répartition", () => {
    const parts = splitInstallments(500, 2, 100); // (500-100)/2 = 200,200
    expect(parts).toEqual([200, 200]);
  });

  it('rejette une avance supérieure au total', () => {
    expect(() => splitInstallments(100, 2, 150)).toThrow();
  });

  it('rejette un nombre de tranches invalide', () => {
    expect(() => splitInstallments(100, 0)).toThrow();
  });
});

describe('deriveAssignmentStatus', () => {
  it('PAID quand tout est payé', () => {
    expect(deriveAssignmentStatus(900, 900)).toBe('PAID');
  });
  it('PARTIAL quand partiellement payé', () => {
    expect(deriveAssignmentStatus(900, 300)).toBe('PARTIAL');
  });
  it('DUE quand rien payé', () => {
    expect(deriveAssignmentStatus(900, 0)).toBe('DUE');
  });
});
