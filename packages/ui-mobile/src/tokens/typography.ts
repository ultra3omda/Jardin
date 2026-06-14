/**
 * V7-B — Typography SCALE tokens (sizes / weights / letter-spacing).
 *
 * Brand & body font FAMILIES live in ./fonts (the names registered via
 * expo-font in apps/mobile/app/_layout.tsx). The `fontFamily*` aliases below
 * mirror them for the rare component that reads typography directly, so they
 * can never drift back to a stale face (was: a dead "Cormorant Garamond" ghost).
 */
import { fonts } from './fonts';

export const typography = {
  /** Brand / heading font (Fraunces SemiBold). Mirrors fonts.display. */
  fontFamilyBrand: fonts.display,
  /** Body font (Public Sans Regular). Mirrors fonts.body. */
  fontFamilyBody: fonts.body,
  sizes: {
    h1: 28,
    h2: 22,
    h3: 18,
    body: 14,
    small: 12,
    label: 11,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extra: '800' as const,
  },
  letterSpacing: {
    label: 1.1,
  },
} as const;

export type TypographyTokens = typeof typography;
