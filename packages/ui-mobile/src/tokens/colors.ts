/**
 * V7-B — Mobile design tokens. Mirrors apps/web/app/globals.css V7 vars
 * so both web and mobile share the exact same hex palette.
 */
export const colors = {
  navy: {
    500: '#94a3b8',
    600: '#6b7280',
    700: '#4b5563',
    800: '#1a2028',
    900: '#0f1419',
  },
  // Accent corail — aligné sur la charte web V7 (remplace l'ancien jaune ambré).
  // Primary — electric coral (Médina, max punch).
  ambre: {
    50: '#ffece4',
    100: '#ffceba',
    500: '#ff4318',
    600: '#f2330a',
    700: '#cc2606',
    900: '#5e1f0e',
  },
  // Médina secondary — electric zellige teal.
  teal: {
    50: '#d2f7f1',
    100: '#9aeee0',
    500: '#02c4ad',
    600: '#02a896',
    700: '#048275',
  },
  // Médina tertiary — bright sun gold.
  gold: {
    50: '#fff0cc',
    100: '#ffdd8c',
    500: '#ffa400',
    600: '#f08d00',
    700: '#c46e00',
  },
  // Playful 4th accent — electric grape (kids/school energy).
  grape: {
    50: '#efe5ff',
    100: '#d7bcff',
    500: '#7a30ff',
    600: '#671bf0',
    700: '#5012c4',
  },
  paper: {
    // Warm sand — Médina daylight, a touch warmer than the old neutral cream.
    50: '#f7f2e9',
    100: '#fafbfc',
  },
  surface: '#ffffff',
  // Hairline border — visible on both white surfaces and the cream page bg
  // (paper[50]). Use for card / button outlines.
  line: '#e2e8f0',
  ink: {
    300: '#94a3b8',
    500: '#475569',
    700: '#1a1d24',
    900: '#0f1419',
  },
  status: {
    success500: '#16a34a',
    success100: '#dcfce7',
    info500: '#1d4ed8',
    info100: '#dbeafe',
    danger500: '#ef4444',
  },
  white: '#ffffff',
  black: '#000000',
} as const;

export type ColorTokens = typeof colors;
