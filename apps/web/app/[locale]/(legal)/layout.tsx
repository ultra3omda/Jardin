import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/routing';

/**
 * Public legal pages shell (privacy, terms, legal notice, cookies).
 * Accessible to everyone — outside (auth) and (app).
 */
export default function LegalLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-paper-edge">
        <div className="container mx-auto flex items-center justify-between px-4 py-5">
          <Link href="/" className="font-display text-xl font-semibold text-ink">
            Klasso
          </Link>
          <Link href="/" className="text-sm text-terracotta hover:underline">
            ← Retour à l’accueil
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 sm:py-16">{children}</main>

      <footer className="border-t border-paper-edge">
        <div className="container mx-auto flex flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-ink-muted">
          <Link href="/legal/privacy" className="hover:text-terracotta">
            Confidentialité
          </Link>
          <Link href="/legal/terms" className="hover:text-terracotta">
            CGU / CGV
          </Link>
          <Link href="/legal/legal-notice" className="hover:text-terracotta">
            Mentions légales
          </Link>
          <Link href="/legal/cookies" className="hover:text-terracotta">
            Cookies
          </Link>
        </div>
      </footer>
    </div>
  );
}
