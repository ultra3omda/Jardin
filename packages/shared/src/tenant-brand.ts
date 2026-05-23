/**
 * Tenant white-label branding contract. JSONB on Tenant.brand.
 * null = use DEFAULT_BRAND (indigo). Lock 2026-05-22 (D20).
 *
 * Spec  : docs/superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md
 * Plan  : docs/superpowers/plans/2026-05-22-v1.6-white-label-runtime.md
 */

export interface TenantBrand {
  /** Bouton/lien principal, hex #RRGGBB */
  primaryColor: string;
  /** Hover/pressed du primary, hex #RRGGBB */
  primaryHover: string;
  /** Secondary / accent, hex #RRGGBB */
  secondaryColor: string;
  /** Couleur d'en-tête email Resend, hex #RRGGBB */
  emailHeaderColor: string;
  /** URL absolue du logo dans R2 bucket public-read, null = pas de logo */
  logoUrl: string | null;
  /** URL absolue du favicon dans R2, null = utiliser /favicon.ico */
  faviconUrl: string | null;
  /** V11 — domaine custom type 'portail.ecole-xyz.fr'. Ignoré en V1.6. */
  customDomain: string | null;
}

export const DEFAULT_BRAND: TenantBrand = {
  primaryColor: '#4f46e5', // indigo-600
  primaryHover: '#4338ca', // indigo-700
  secondaryColor: '#1e1b4b', // indigo-950
  emailHeaderColor: '#4f46e5',
  logoUrl: null,
  faviconUrl: null,
  customDomain: null,
};

/**
 * Convert #RRGGBB to a shadcn-compatible HSL triplet "H S% L%" (no `hsl()`).
 * shadcn CSS uses `hsl(var(--primary) / <alpha-value>)`, so the var
 * must contain the triplet, not a wrapped hsl(...).
 *
 * Throws on invalid hex — caller MUST validate beforehand.
 */
export function hexToHslTriplet(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`hexToHslTriplet: invalid hex "${hex}"`);
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** True iff string matches /^#[0-9a-f]{6}$/i. */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

/**
 * Reserved subdomain slugs that MUST NOT be tenant slugs.
 * Used by V11 subdomain resolver and by tenant creation validation.
 */
export const RESERVED_TENANT_SLUGS = [
  'app',
  'www',
  'api',
  'admin',
  'mail',
  'auth',
  'cdn',
  'static',
  'assets',
];
