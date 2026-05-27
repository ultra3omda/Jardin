/**
 * V7-B — Typography tokens. RN does not load Cormorant Garamond by default;
 * if needed at runtime, register via expo-font + @expo-google-fonts.
 * Until then `fontFamilyBrand` falls back to System on consumer side.
 */
export const typography = {
  /** Brand / heading font (Cormorant Garamond). System fallback if not loaded. */
  fontFamilyBrand: 'CormorantGaramond_600SemiBold',
  /** Body font (system). */
  fontFamilyBody: undefined as string | undefined,
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
