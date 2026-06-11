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
  // Primary — vivid coral (Médina, punchier & more playful).
  ambre: {
    50: '#fff0ea',
    100: '#ffdacb',
    500: '#ff5a36',
    600: '#ed4524',
    700: '#c9351a',
    900: '#5e1f0e',
  },
  // Médina secondary — vivid zellige teal.
  teal: {
    50: '#dcf5f1',
    100: '#aee9e1',
    500: '#10b3a3',
    600: '#0c948a',
    700: '#0a746d',
  },
  // Médina tertiary — sunny gold.
  gold: {
    50: '#fff3d6',
    100: '#ffe0a0',
    500: '#ffb020',
    600: '#ed9b0e',
    700: '#c47e0a',
  },
  // Playful 4th accent — grape (kids/school energy).
  grape: {
    50: '#f3ebff',
    100: '#e0ccff',
    500: '#7c4dff',
    600: '#6a3aef',
    700: '#5326c4',
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
