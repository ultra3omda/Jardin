/**
 * G2 — Fonctions pures de calcul d'échéancier de frais.
 *
 * Le piège métier : répartir un montant en N tranches en `Decimal(10,3)` (millime
 * tunisien) sans perdre de millime. On travaille en entiers de millimes puis on
 * reconvertit ; le reliquat d'arrondi va sur la dernière tranche.
 */

/** Répartit un montant TND (Decimal 3) en `count` tranches au millime près.
 *  Le reliquat d'arrondi tombe sur la dernière tranche. */
export function splitInstallments(
  total: number,
  count: number,
  advance = 0,
): number[] {
  if (count < 1) throw new Error('count must be >= 1');
  if (advance > total) throw new Error('advance cannot exceed total');
  const millimes = Math.round((total - advance) * 1000); // entier de millimes
  const base = Math.floor(millimes / count);
  const remainder = millimes - base * count;
  const parts: number[] = [];
  for (let i = 0; i < count; i++) {
    const cents = base + (i === count - 1 ? remainder : 0);
    parts.push(cents / 1000);
  }
  return parts;
}

export type AssignmentStatus = 'DUE' | 'PARTIAL' | 'PAID' | 'CANCELLED';

/** Statut d'une affectation selon le montant payé vs dû. */
export function deriveAssignmentStatus(
  totalDue: number,
  totalPaid: number,
): AssignmentStatus {
  if (totalPaid <= 0) return 'DUE';
  if (totalPaid >= totalDue) return 'PAID';
  return 'PARTIAL';
}
