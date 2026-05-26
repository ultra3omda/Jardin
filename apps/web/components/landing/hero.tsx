import { useTranslations } from 'next-intl';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';

export function Hero() {
  const t = useTranslations('landing.hero');

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-20 sm:py-28 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t('title')}
            <span className="block text-primary mt-2">{t('subtitle')}</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">{t('description')}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={'#demo-form' as Route} className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {t('ctaPrimary')}
            </Link>
            <Link href={'/login' as Route} className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-base font-medium hover:bg-accent hover:text-accent-foreground transition">
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
