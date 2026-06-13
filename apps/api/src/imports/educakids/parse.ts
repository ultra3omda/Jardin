/**
 * EducaKids import — parseurs purs (testés en unit).
 * Transforment les valeurs brutes des exports EducaKids en valeurs propres
 * pour les modèles Klasso.
 */

/** « ben jaballah Elyana » → { firstName: 'Elyana', lastName: 'ben jaballah' }.
 *  Heuristique : dernier token = prénom, le reste = nom (ordre arabe variable,
 *  à valider via le dry-run). */
export function splitName(full: string): { firstName: string; lastName: string } {
  const tokens = full.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { firstName: '', lastName: '' };
  if (tokens.length === 1) return { firstName: tokens[0], lastName: '' };
  const firstName = tokens[tokens.length - 1];
  const lastName = tokens.slice(0, -1).join(' ');
  return { firstName, lastName };
}

/** « 2026-02-11Z » → Date (suffixe Z legacy retiré). */
export function parseLegacyDate(s: string): Date {
  return new Date(String(s).replace(/Z$/, ''));
}

/** « 520.0 » → 520 (arrondi au millime). */
export function parseAmount(s: string | number): number {
  const n = typeof s === 'number' ? s : parseFloat(s);
  return Math.round((Number.isFinite(n) ? n : 0) * 1000) / 1000;
}

/** « Jardin d'enfants -3ans: 3ans-Les poussins »
 *  → { level: "Jardin d'enfants -3ans", name: '3ans-Les poussins' }. */
export function parseClassLabel(label: string): { level: string; name: string } {
  const idx = label.indexOf(':');
  if (idx === -1) return { level: label.trim(), name: label.trim() };
  return {
    level: label.slice(0, idx).trim(),
    name: label.slice(idx + 1).trim(),
  };
}

/** Normalise un nom pour la réconciliation (minuscules, espaces compactés). */
export function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
