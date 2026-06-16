export type GradeTone = 'good' | 'ok' | 'low';

/** Couleur sémantique d'une note, normalisée sur 20 (≥14 good, ≥10 ok, sinon low). */
export function gradeTone(value: number, outOf = 20): GradeTone {
  const normalized = outOf > 0 ? (value / outOf) * 20 : 0;
  if (normalized >= 14) return 'good';
  if (normalized >= 10) return 'ok';
  return 'low';
}
