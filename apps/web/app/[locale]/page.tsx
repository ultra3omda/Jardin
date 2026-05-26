import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { Benefits } from '@/components/landing/benefits';
import { Footer } from '@/components/landing/footer';
import { Hero } from '@/components/landing/hero';
import { ModulesGrid } from '@/components/landing/modules-grid';
import { Pricing } from '@/components/landing/pricing';
import { Trust } from '@/components/landing/trust';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Klasso — L\'école à l\'ère numérique',
  description:
    'Plateforme SaaS de gestion d\'écoles tunisiennes — élèves, parents, enseignants et finances en un seul endroit.',
};

interface Props {
  params: { locale: string };
}

/**
 * V0 Landing — 6 sections composées (DemoForm rejoint en P3 Task 24).
 */
export default function LandingPage({ params: { locale } }: Props) {
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <section id="benefits">
        <Benefits />
      </section>
      <section id="modules">
        <ModulesGrid />
      </section>
      <Trust />
      <Pricing />
      {/* DemoForm sera inséré ici en P3 Task 24 */}
      <Footer />
    </>
  );
}
