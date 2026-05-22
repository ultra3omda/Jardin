import { getRequestConfig } from 'next-intl/server';

/**
 * next-intl request config — V1.5 ships single-locale FR only.
 *
 * V2+ will introduce a [locale] segment in app/ and read the locale from
 * the URL. For now we hard-pin to 'fr' so the infrastructure is wired up
 * (NextIntlClientProvider, useTranslations() hook, message catalog) but
 * no existing route changes.
 */
export const SUPPORTED_LOCALES = ['fr', 'en', 'ar', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'fr';

export default getRequestConfig(async () => {
  const locale: SupportedLocale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
