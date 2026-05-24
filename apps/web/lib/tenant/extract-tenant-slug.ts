/**
 * V1.7-A — Helper: extract tenant slug from host header.
 *
 * Utilisé par le middleware Next.js (dormant tant que
 * ENABLE_SUBDOMAIN_RESOLVER !== 'true').
 *
 * Pattern attendu : <slug>.<baseDomain>
 * Ex : mon-ecole.klasso.tn → 'mon-ecole'
 */

/** Slugs réservés — jamais mappés à un tenant */
export const RESERVED_SLUGS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'assets',
  'docs',
  'status',
  'mail',
  'support',
  'dashboard',
]);

/** Regex pour valider un slug tenant : lowercase, chiffres, tirets */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$|^[a-z0-9]$/;

/**
 * Extrait le slug tenant depuis le host HTTP.
 *
 * @param host       - valeur de l'en-tête `Host` (ex: "mon-ecole.klasso.tn")
 * @param baseDomain - domaine racine sans sous-domaine (ex: "klasso.tn")
 * @returns slug tenant ou null si non applicable
 */
export function extractTenantSlugFromHost(
  host: string,
  baseDomain: string,
): string | null {
  // Retirer le port si présent
  const hostname = host.split(':')[0];

  // Vérifier que le host se termine par .<baseDomain>
  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) return null;

  const slug = hostname.slice(0, hostname.length - suffix.length);

  // Slug vide = domaine racine
  if (!slug) return null;

  // Slug réservé
  if (RESERVED_SLUGS.has(slug)) return null;

  // Format invalide
  if (!SLUG_REGEX.test(slug)) return null;

  return slug;
}
