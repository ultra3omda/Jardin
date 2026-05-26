'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';

export function Hero() {
  const t = useTranslations('landing.hero');
  const locale = useLocale();
  const title = t('title');
  const words = title.split(' ');

  return (
    <section className="relative isolate overflow-hidden bg-paper paper-grain">
      <div className="container mx-auto px-4 py-20 sm:py-28 md:py-32">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Text column */}
          <div className={locale === 'ar' ? 'md:order-2' : ''}>
            <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl md:text-6xl">
              {words.map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
                  className="me-[0.25em] inline-block"
                >
                  {word}
                </motion.span>
              ))}
              <span className="mt-2 block text-terracotta">{t('subtitle')}</span>
            </h1>
            <p
              className={`mt-4 ${locale === 'ar' ? 'font-sans' : 'font-display-ar'} text-2xl italic text-ink-muted`}
              lang={locale === 'ar' ? 'fr' : 'ar'}
              dir={locale === 'ar' ? 'ltr' : 'rtl'}
            >
              {t('subtitleAr')}
            </p>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              {t('descriptionUpgraded')}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={'#demo-form' as Route}
                className="inline-flex h-12 items-center justify-center rounded-md bg-terracotta px-8 text-base font-medium text-paper shadow-lg transition hover:bg-terracotta-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
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
            <p className="mt-8 text-sm text-ink-faded">{t('trustStrip')}</p>
          </div>

          {/* Photo column */}
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${locale === 'ar' ? 'md:order-1' : ''}`}
          >
            <Image
              src="/landing/hero.svg"
              alt={t('photoAlt')}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover landing-photo"
            />
            <div
              aria-hidden
              className="absolute inset-0 mix-blend-multiply"
              style={{
                background:
                  'linear-gradient(135deg, oklch(var(--terracotta) / 0.35), oklch(var(--teal-deep) / 0.25))',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
