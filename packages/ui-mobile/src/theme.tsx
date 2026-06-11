import { createContext, useContext, type ReactNode } from 'react';
import { colors } from './tokens/colors';

/**
 * Runtime theme = the per-tenant accent colors. Everything structural (ink,
 * paper, surface, line, the Médina teal/gold chrome) stays in the static
 * tokens; only the PRIMARY brand colour adapts per establishment (white-label).
 */
export interface Theme {
  /** Main accent — buttons, FAB, active tab, links. */
  primary: string;
  /** Darkened primary — hero blocks. */
  primaryDark: string;
  /** Very light primary — active pill / tinted surfaces. */
  primaryTint: string;
  /** Readable text/icon colour on top of `primary`. */
  onPrimary: string;
}

// ─── hex helpers ────────────────────────────────────────────────────────────

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  return [
    parseInt(m[1].slice(0, 2), 16),
    parseInt(m[1].slice(2, 4), 16),
    parseInt(m[1].slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => clampByte(v).toString(16).padStart(2, '0')).join('');
}

/** Mix a hex toward black (amount 0..1). */
export function darken(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(rgb[0] * (1 - amount), rgb[1] * (1 - amount), rgb[2] * (1 - amount));
}

/** Mix a hex toward white (amount 0..1). */
export function lighten(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(
    rgb[0] + (255 - rgb[0]) * amount,
    rgb[1] + (255 - rgb[1]) * amount,
    rgb[2] + (255 - rgb[2]) * amount,
  );
}

/** Relative luminance → pick black/white text for contrast on `hex`. */
export function onColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#ffffff';
  const [r, g, b] = rgb.map((v) => v / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? colors.ink[900] : '#ffffff';
}

// ─── default (Médina) + builder ─────────────────────────────────────────────

/** The default app accent when a tenant has no custom brand. */
export const DEFAULT_THEME: Theme = {
  primary: colors.ambre[500],
  primaryDark: colors.ambre[700],
  primaryTint: colors.ambre[50],
  onPrimary: colors.white,
};

/** White-label default (indigo) — treated as "no custom brand" on mobile. */
const WHITE_LABEL_DEFAULT_PRIMARY = '#4f46e5';

/**
 * Build the runtime theme from a tenant's primary colour. Falls back to the
 * Médina default when the colour is missing/invalid OR is the platform's
 * indigo default (i.e. the tenant never customised its brand).
 */
export function buildTheme(primaryColor?: string | null): Theme {
  const isHex = typeof primaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(primaryColor);
  if (!isHex || primaryColor!.toLowerCase() === WHITE_LABEL_DEFAULT_PRIMARY) {
    return DEFAULT_THEME;
  }
  const primary = primaryColor as string;
  return {
    primary,
    primaryDark: darken(primary, 0.34),
    primaryTint: lighten(primary, 0.86),
    onPrimary: onColor(primary),
  };
}

const ThemeContext = createContext<Theme>(DEFAULT_THEME);

/** Active accent theme. Safe to call without a provider (returns the default). */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function ThemeProvider({ value, children }: { value: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
