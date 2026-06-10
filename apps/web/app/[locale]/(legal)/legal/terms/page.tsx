import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { LegalDocument } from '@/components/legal/legal-document';
import { TERMS } from '@/lib/legal/content';

export const metadata: Metadata = {
  title: 'CGU / CGV — Klasso',
  description: "Conditions générales d'utilisation et de vente du service Klasso.",
};

export default function TermsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <LegalDocument doc={TERMS} />;
}
