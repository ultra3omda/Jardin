/**
 * Klasso design system V7 « Médina » — shared token CONTRACT.
 *
 * Single source of truth for the design tokens shared by web (`apps/web`) and
 * mobile (`apps/mobile` / `@klasso/ui-mobile`). Two principles, locked:
 *
 *  1. STRUCTURAL tokens (navy, ink, status, surface, paper-100) are IDENTICAL on
 *     both platforms. They are defined here once and enforced by guard tests:
 *       - mobile: apps/mobile/lib/__tests__/design-tokens.test.ts (Jest)
 *       - web:    apps/web/lib/ui/__tests__/design-tokens.test.ts  (Vitest)
 *     A drift in either consumer fails CI.
 *
 *  2. BRAND tokens are DELIBERATELY different per platform (locked 2026-05-24,
 *     branding non touché — confirmed deliberate, not drift):
 *       - WEB:    teal primary (#02c4ad), muted coral accent (#f2683f).
 *       - MOBILE: electric coral primary (#ff4318), teal secondary, plus playful
 *                 gold/grape accents — the "max punch" kids/school energy.
 *     They are documented here so the difference stays intentional and visible.
 *
 * This module is pure data (no deps). Metro reads it from source via the
 * package `exports["."].react-native` condition; web/api read it from `dist`
 * after `pnpm --filter @ecole-saas/shared build`.
 *
 * NOTE (known item, NOT changed here): the white-label fallback DEFAULT_BRAND in
 * ./tenant-brand.ts is still indigo (#4f46e5) while the V7 app base is teal —
 * a white-label concern, deliberately out of scope for the token contract.
 */

// ============================================================================
// Structural tokens — identical on web + mobile (single source of truth)
// ============================================================================

/** Sidebar / strong-ink neutral ramp (Klasio-inspired navy). */
export const STRUCTURAL_NAVY = {
  500: '#94a3b8',
  600: '#6b7280',
  700: '#4b5563',
  800: '#1a2028',
  900: '#0f1419',
} as const;

/** Text ramp — headings to muted captions. */
export const STRUCTURAL_INK = {
  300: '#94a3b8',
  500: '#475569',
  700: '#1a1d24',
  900: '#0f1419',
} as const;

/** Semantic status colors (success / info / danger). */
export const STRUCTURAL_STATUS = {
  success500: '#16a34a',
  success100: '#dcfce7',
  info500: '#1d4ed8',
  info100: '#dbeafe',
  danger500: '#ef4444',
} as const;

/** Pure white card / input surface. */
export const STRUCTURAL_SURFACE = '#ffffff';

/** Alt section background (cool near-white), shared by both platforms. */
export const STRUCTURAL_PAPER_100 = '#fafbfc';

/** All structural tokens grouped — the part both platforms MUST share verbatim. */
export const STRUCTURAL_TOKENS = {
  navy: STRUCTURAL_NAVY,
  ink: STRUCTURAL_INK,
  status: STRUCTURAL_STATUS,
  surface: STRUCTURAL_SURFACE,
  paper100: STRUCTURAL_PAPER_100,
} as const;

// ============================================================================
// Web brand — teal primary, muted coral accent
// ============================================================================

export const WEB_BRAND_TOKENS = {
  /** App-wide primary brand (buttons, focus rings). CSS: --primary 181 83% 28%. */
  primaryTeal: '#02c4ad',
  /** Warm page background (cream paper). CSS: --paper-50. */
  paper50: '#f4f4ef',
  /** Muted coral accent (CTAs, badges). CSS: --ambre-*. */
  ambre: {
    50: '#fff3ef',
    100: '#ffe1d7',
    500: '#f2683f',
    600: '#df4f2a',
    700: '#b03a1d',
  },
} as const;

// ============================================================================
// Mobile brand — electric coral primary, teal secondary, playful accents
// ============================================================================

export const MOBILE_BRAND_TOKENS = {
  /** Warmer "Médina daylight" page background. */
  paper50: '#f7f2e9',
  /** Hairline border visible on both white surfaces and the cream page bg. */
  line: '#e2e8f0',
  /** Electric coral — the mobile PRIMARY ("max punch"). */
  ambre: {
    50: '#ffece4',
    100: '#ffceba',
    500: '#ff4318',
    600: '#f2330a',
    700: '#cc2606',
    900: '#5e1f0e',
  },
  /** Electric zellige teal — mobile SECONDARY (same hue as web primary). */
  teal: {
    50: '#d2f7f1',
    100: '#9aeee0',
    500: '#02c4ad',
    600: '#02a896',
    700: '#048275',
  },
  /** Bright sun gold — mobile tertiary accent. */
  gold: {
    50: '#fff0cc',
    100: '#ffdd8c',
    500: '#ffa400',
    600: '#f08d00',
    700: '#c46e00',
  },
  /** Electric grape — playful 4th accent (kids/school energy). */
  grape: {
    50: '#efe5ff',
    100: '#d7bcff',
    500: '#7a30ff',
    600: '#671bf0',
    700: '#5012c4',
  },
} as const;

// ============================================================================
// Brand typography — canonical family names (loading is per-platform)
// ============================================================================

/**
 * Canonical font family names. Web loads them via next/font CSS variables;
 * mobile embeds the .ttf faces via expo-font in apps/mobile/app/_layout.tsx
 * (e.g. "Fraunces-SemiBold"). The CANONICAL family is what both must agree on.
 */
export const BRAND_FONTS = {
  /** Display / headings. */
  display: 'Fraunces',
  /** Body copy. */
  body: 'Public Sans',
  /** Display / headings — Arabic (RTL). */
  displayArabic: 'Markazi Text',
  /** Body copy — Arabic (RTL). */
  bodyArabic: 'IBM Plex Sans Arabic',
  /** Monospace (code, references). */
  mono: 'JetBrains Mono',
} as const;

// ============================================================================
// Scales
// ============================================================================

/** Both platforms use a 4px spacing grid. */
export const SPACING_BASE_PX = 4;

export type StructuralTokens = typeof STRUCTURAL_TOKENS;
export type WebBrandTokens = typeof WEB_BRAND_TOKENS;
export type MobileBrandTokens = typeof MOBILE_BRAND_TOKENS;
export type BrandFonts = typeof BRAND_FONTS;
