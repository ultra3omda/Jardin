import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';
import { DeckleEdge } from './atoms/deckle-edge';
import { Section } from './atoms/section';

type TierKey = 'starter' | 'standard' | 'pro';
const TIERS: ReadonlyArray<{ key: TierKey; featured: boolean }> = [
  { key: 'starter', featured: false },
  { key: 'standard', featured: true },
  { key: 'pro', featured: false },
];

export function Pricing() {
  const t = useTranslations('landing.pricing');
  return (
    <Section id="pricing" alt>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-4 text-lg text-ink-muted">{t('subtitle')}</p>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        {TIERS.map(({ key, featured }) => {
          const features = t.raw(`tiers.${key}.features`) as string[];
          return (
            <div
              key={key}
              className={
                featured
                  ? 'relative flex flex-col rounded-2xl border-2 border-teal-deep bg-paper shadow-xl'
                  : 'flex flex-col rounded-2xl border border-paper-edge bg-paper'
              }
            >
              {featured && (
                <>
                  <DeckleEdge className="-mt-px text-teal-deep" />
                  <div className="absolute -top-4 start-1/2 -translate-x-1/2 rounded-full bg-ochre px-4 py-1 text-xs font-semibold text-ink shadow rtl:translate-x-1/2">
                    {t('popular')}
                  </div>
                </>
              )}
              <div className="flex flex-1 flex-col p-8">
                <h3 className="font-display text-2xl font-semibold text-ink">
                  {t(`tiers.${key}.name`)}
                </h3>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-mono text-5xl font-semibold text-terracotta">
                    {t(`tiers.${key}.price`)}
                  </span>
                  <span className="text-sm text-ink-muted">{t(`tiers.${key}.unit`)}</span>
                </div>
                <p className="mt-2 text-sm text-ink-faded">{t(`tiers.${key}.limit`)}</p>
                <ul className="mt-6 space-y-3">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-ink-muted">
                      <Check
                        className="mt-0.5 h-5 w-5 flex-none text-terracotta"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={'#demo-form' as Route}
                  className={
                    featured
                      ? 'mt-8 inline-flex h-11 items-center justify-center rounded-md bg-terracotta px-6 text-sm font-medium text-paper transition hover:bg-terracotta-dark'
                      : 'mt-8 inline-flex h-11 items-center justify-center rounded-md border border-terracotta px-6 text-sm font-medium text-terracotta transition hover:bg-terracotta hover:text-paper'
                  }
                >
                  {t('cta')}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
