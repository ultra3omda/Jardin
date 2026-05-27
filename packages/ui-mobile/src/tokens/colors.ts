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
  ambre: {
    50: '#fff7e0',
    100: '#fef3c7',
    500: '#fbb13c',
    600: '#e89218',
    700: '#b45309',
  },
  paper: {
    50: '#f4f4ef',
    100: '#fafbfc',
  },
  surface: '#ffffff',
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
