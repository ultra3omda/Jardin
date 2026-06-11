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
  ambre: {
    50: '#fff3ef',
    100: '#ffe1d7',
    500: '#f2683f',
    600: '#df4f2a',
    700: '#b03a1d',
  },
  paper: {
    50: '#f4f4ef',
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
