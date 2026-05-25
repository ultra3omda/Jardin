import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

/**
 * V0 Landing — i18n configuration.
 * Sub-paths /fr (default) and /ar (RTL).
 * Migrated from V1.5 i18n/request.ts which was single-locale FR.
 */
export const locales = ['fr', 'ar'] as const;
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
