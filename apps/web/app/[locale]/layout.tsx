import type { Metadata } from 'next';
import { Fraunces, Public_Sans, JetBrains_Mono, Markazi_Text, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { CookieConsent } from '@/components/CookieConsent';
import { locales, type Locale } from '@/i18n';
import '../globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['SOFT', 'opsz'],
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const markaziText = Markazi_Text({
  subsets: ['arabic', 'latin'],
  variable: '--font-display-ar',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  variable: '--font-body-ar',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Klasso — L'école à l'ère numérique",
  description:
    "Plateforme SaaS de gestion d'écoles tunisiennes — élèves, parents, enseignants et finances en un seul endroit.",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!locales.includes(locale as Locale)) notFound();

  // V0 — next-intl v4 setRequestLocale enables static rendering with locale.
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fraunces.variable} ${publicSans.variable} ${jetBrainsMono.variable} ${markaziText.variable} ${ibmPlexArabic.variable}`}
    >
      <body className={locale === 'ar' ? 'font-sans-ar antialiased' : 'font-sans antialiased'}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
