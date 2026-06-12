/**
 * G1 — Fonctions pures de calcul de clôture de caisse.
 * Tout est arrondi au millime (Decimal 3) pour rester cohérent avec les montants TND.
 */

export type Movement = { kind: 'INCOME' | 'EXPENSE'; amount: number };

/** floor + Σ INCOME − Σ EXPENSE, arrondi au millime. */
export function computeExpected(openingFloat: number, movements: Movement[]): number {
  const sum = movements.reduce(
    (acc, m) => acc + (m.kind === 'INCOME' ? m.amount : -m.amount),
    openingFloat,
  );
  return Math.round(sum * 1000) / 1000;
}

/** countedAmount − expectedAmount, arrondi au millime. */
export function computeVariance(expected: number, counted: number): number {
  return Math.round((counted - expected) * 1000) / 1000;
}
