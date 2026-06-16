/** Parse une note saisie : nombre fini dans [0, maxScore], sinon null. Accepte la virgule FR. */
export function parseScoreInput(raw: string, maxScore: number): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > maxScore) return null;
  return n;
}
