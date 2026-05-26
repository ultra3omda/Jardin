import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Klasso — L\'école à l\'ère numérique',
};

interface Props {
  params: { locale: string };
}

/**
 * V0 Landing — placeholder.
 * Sera composé par 7 sections en P2 (Task 16).
 */
export default function LandingPage({ params: { locale } }: Props) {
  setRequestLocale(locale);

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Klasso</h1>
        <p className="text-lg text-muted-foreground">L&apos;école à l&apos;ère numérique</p>
        <a
          href="/login"
          className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium"
        >
          Se connecter
        </a>
      </div>
    </main>
  );
}
