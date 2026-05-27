/**
 * V7-B — Spacing + radius tokens. Mobile uses absolute dp values.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  full: 9999,
} as const;

export type SpacingTokens = typeof spacing;
export type RadiusTokens = typeof radius;
