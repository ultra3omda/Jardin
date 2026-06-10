import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { LegalDocument } from '@/components/legal/legal-document';
import { PRIVACY } from '@/lib/legal/content';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Klasso',
  description: 'Comment Klasso protège les données personnelles, y compris celles des mineurs.',
};

export default function PrivacyPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <LegalDocument doc={PRIVACY} />;
}
