import { useTranslations } from 'next-intl';
import type { Route } from 'next';
import { Check } from 'lucide-react';

import { Link } from '@/i18n/routing';

const TIERS = [
  { key: 'starter', featured: false, featuresCount: 3 },
  { key: 'standard', featured: true, featuresCount: 5 },
  { key: 'pro', featured: false, featuresCount: 4 },
] as const;

export function Pricing() {
  const t = useTranslations('landing.pricing');
  return (
    <section id="pricing" className="bg-muted/30 py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:gap-8 lg:items-stretch">
          {TIERS.map(({ key, featured, featuresCount }) => (
            <div key={key} className={`rounded-2xl border bg-card p-8 ${featured ? 'border-primary shadow-xl lg:scale-105' : 'shadow-sm'}`}>
              {featured && (
                <p className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">{t('popular')}</p>
              )}
              <h3 className={`${featured ? 'mt-4' : ''} text-2xl font-semibold`}>{t(`tiers.${key}.name`)}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight">{t(`tiers.${key}.price`)}</span>
                <span className="text-sm text-muted-foreground">{t(`tiers.${key}.unit`)}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">{t(`tiers.${key}.limit`)}</p>
              <ul className="mt-6 space-y-3">
                {Array.from({ length: featuresCount }, (_, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <span>{t(`tiers.${key}.features.${i}`)}</span>
                  </li>
                ))}
              </ul>
              <Link href={'#demo-form' as Route} className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-md px-6 text-sm font-medium transition ${featured ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border bg-background hover:bg-accent'}`}>
                {t('cta')}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
