import { isRtlLocale, LANGUAGES } from '@/lib/i18n';

describe('i18n language contract', () => {
  it('marks only Arabic as RTL', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('fr')).toBe(false);
    expect(isRtlLocale('en')).toBe(false);
    expect(isRtlLocale('es')).toBe(false);
  });

  it('returns false for unknown codes', () => {
    expect(isRtlLocale('zz')).toBe(false);
  });

  it('exposes the 4 supported languages with native labels', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['fr', 'en', 'es', 'ar']);
    expect(LANGUAGES.find((l) => l.code === 'ar')?.label).toBe('العربية');
  });
});
