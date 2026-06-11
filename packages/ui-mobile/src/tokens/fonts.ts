/**
 * V7 brand typography. Fraunces (serif) for display/headings, Public Sans
 * (sans) for body — mirrors the web charter.
 *
 * The family names MUST match the keys registered via expo-font's `useFonts`
 * in apps/mobile/app/_layout.tsx. When a `fontFamily` is set, the embedded
 * weight wins, so pick the matching face rather than relying on `fontWeight`.
 */
export const fonts = {
  /** Fraunces SemiBold — section titles, screen headers. */
  display: 'Fraunces-SemiBold',
  /** Fraunces Bold — hero titles. */
  displayBold: 'Fraunces-Bold',
  /** Public Sans Regular — body copy. */
  body: 'PublicSans-Regular',
  /** Public Sans Medium — emphasised body. */
  bodyMedium: 'PublicSans-Medium',
  /** Public Sans SemiBold — buttons, labels. */
  bodySemibold: 'PublicSans-SemiBold',
  /** Public Sans Bold — strong emphasis. */
  bodyBold: 'PublicSans-Bold',
} as const;

export type FontTokens = typeof fonts;
