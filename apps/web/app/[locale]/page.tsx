import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { Benefits } from '@/components/landing/benefits';
import { CtaFinal } from '@/components/landing/cta-final';
import { DashboardMockup } from '@/components/landing/dashboard-mockup';
import { DemoForm } from '@/components/landing/demo-form';
import { Faq } from '@/components/landing/faq';
import { Footer } from '@/components/landing/footer';
import { Hero } from '@/components/landing/hero';
import { ModulesGrid } from '@/components/landing/modules-grid';
import { Pricing } from '@/components/landing/pricing';
import { SchoolSegments } from '@/components/landing/school-segments';
import { Stats } from '@/components/landing/stats';
import { Trust } from '@/components/landing/trust';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Klasso — L'école à l'ère numérique",
  description:
    "Plateforme SaaS pensée pour les écoles tunisiennes — élèves, parents, enseignants, finances. En un seul tableau de bord.",
};

interface Props {
  params: { locale: string };
}

/**
 * V0.5 Landing — Tunisian Editorial composition (12 sections).
 * Order locked by spec docs/superpowers/specs/2026-05-26-landing-ux-upgrade.md §3.
 */
export default function LandingPage({ params: { locale } }: Props) {
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <Hero />
      <Stats />
      <SchoolSegments />
      <Benefits />
      <DashboardMockup />
      <ModulesGrid />
      <Trust />
      <Pricing />
      <Faq />
      <CtaFinal />
      <DemoForm />
      <Footer />
    </main>
  );
}
