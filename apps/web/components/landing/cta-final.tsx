import { useTranslations } from 'next-intl';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';
import { ZelligePattern } from './atoms/zellige-pattern';

export function CtaFinal() {
  const t = useTranslations('landing.ctaFinal');
  return (
    <section className="relative isolate overflow-hidden bg-paper-alt">
      <ZelligePattern opacity={0.1} />
      <div className="container relative z-10 mx-auto px-4 py-20 text-center sm:py-28">
        <h2 className="mx-auto max-w-3xl font-display text-3xl font-medium tracking-tight text-ink sm:text-5xl">
          {t('title')}
        </h2>
        <p className="mt-5 text-lg text-ink-muted">{t('subtitle')}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={'#demo-form' as Route}
            className="inline-flex h-12 items-center justify-center rounded-md bg-terracotta px-8 text-base font-medium text-paper shadow-lg transition hover:bg-terracotta-dark"
          >
            {t('ctaPrimary')}
          </Link>
          <Link
            href={'/login' as Route}
            className="inline-flex h-12 items-center justify-center rounded-md border border-paper-edge bg-paper px-8 text-base font-medium text-ink transition hover:bg-paper-alt"
          >
            {t('ctaSecondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
