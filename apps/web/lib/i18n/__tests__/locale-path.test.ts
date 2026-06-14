import { describe, expect, it } from 'vitest';

import { detectLocale, stripLocalePrefix } from '../locale-path';

const LOCALES = ['fr', 'en', 'es', 'ar'] as const;

describe('stripLocalePrefix', () => {
  it('strips the locale segment from a nested path', () => {
    expect(stripLocalePrefix('/fr/dashboard', LOCALES)).toBe('/dashboard');
    expect(stripLocalePrefix('/ar/login', LOCALES)).toBe('/login');
  });

  it('maps a bare locale root to "/"', () => {
    expect(stripLocalePrefix('/en', LOCALES)).toBe('/');
  });

  it('returns the path unchanged when there is no locale prefix', () => {
    expect(stripLocalePrefix('/t/ecole/login', LOCALES)).toBe('/t/ecole/login');
  });
});

describe('detectLocale', () => {
  it.each(LOCALES)('detects the %s prefix', (locale) => {
    expect(detectLocale(`/${locale}/dashboard`, LOCALES, 'fr')).toBe(locale);
    expect(detectLocale(`/${locale}`, LOCALES, 'fr')).toBe(locale);
  });

  it('does not confuse a locale-like word inside the path', () => {
    // "/english/..." must NOT match the "en" locale.
    expect(detectLocale('/english/page', LOCALES, 'fr')).toBe('fr');
  });

  it('falls back when no locale prefix is present', () => {
    expect(detectLocale('/login', LOCALES, 'fr')).toBe('fr');
  });
});
