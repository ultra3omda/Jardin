import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { LegalDocument } from '@/components/legal/legal-document';
import { LEGAL_NOTICE } from '@/lib/legal/content';

export const metadata: Metadata = {
  title: 'Mentions légales — Klasso',
  description: "Informations légales sur l'éditeur du service Klasso.",
};

export default function LegalNoticePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <LegalDocument doc={LEGAL_NOTICE} />;
}
