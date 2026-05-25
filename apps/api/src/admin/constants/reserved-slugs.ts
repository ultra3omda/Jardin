/**
 * V1.8 — Slugs jamais autorisés pour un tenant.
 * Mirror conscient de `apps/web/lib/tenant/extract-tenant-slug.ts:RESERVED_SLUGS`
 * (V1.7-A). Liste courte et stable — duplication acceptable.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
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
