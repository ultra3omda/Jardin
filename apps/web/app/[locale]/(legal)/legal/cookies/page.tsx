import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { LegalDocument } from '@/components/legal/legal-document';
import { COOKIES } from '@/lib/legal/content';

export const metadata: Metadata = {
  title: 'Politique cookies — Klasso',
  description: 'Usage des cookies et traceurs sur Klasso.',
};

export default function CookiesPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <LegalDocument doc={COOKIES} />;
}
