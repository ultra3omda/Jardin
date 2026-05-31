import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

/**
 * i18n configuration. Sub-paths /fr (default), /en, /es, /ar (RTL).
 * RTL is derived from the locale in app/[locale]/layout.tsx (dir="rtl" for ar).
 */
export const locales = ['fr', 'en', 'es', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the URL segment (next-intl v4 API).
  const locale = ((await requestLocale) ?? defaultLocale) as Locale;
  if (!locales.includes(locale)) notFound();
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
