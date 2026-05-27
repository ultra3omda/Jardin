'use client';

import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';
import { HeroMockup } from './atoms/hero-mockup';

export function Hero() {
  const t = useTranslations('landing.hero');
  const locale = useLocale();
  const title = t('title');
  const words = title.split(' ');

  return (
    <section className="relative isolate overflow-hidden bg-navy-900">
      {/* Subtle grid overlay */}
      <div aria-hidden className="hero-grid absolute inset-0 pointer-events-none" />

      {/* Warm top-center glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(ellipse, rgba(251,177,60,0.12) 0%, transparent 70%)' }}
      />

      <div className="container relative z-10 mx-auto px-4 py-20 sm:py-28 md:py-32">
        <div className="grid items-center gap-14 md:grid-cols-2">

          {/* ── Text column ── */}
          <div className={locale === 'ar' ? 'md:order-2' : ''}>
            {/* Label chip */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ambre-500)' }} />
              <span className="font-mono text-[11px] uppercase tracking-wider text-white/55">
                SaaS Scolaire · Multi-tenant · RGPD-ready
              </span>
            </motion.div>

            {/* Main heading */}
            <h1 className="font-display text-5xl font-medium leading-[1.06] tracking-tight text-white sm:text-6xl md:text-[4.25rem]">
              {words.map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 + i * 0.07, ease: 'easeOut' }}
                  className="me-[0.22em] inline-block"
                >
                  {word}
                </motion.span>
              ))}
              {/* Ambre accent subtitle */}
              <motion.span
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 + words.length * 0.07 + 0.05 }}
                className="mt-1 block"
              >
                <span className="relative inline-block" style={{ color: 'var(--ambre-500)' }}>
                  {t('subtitle')}
                  <svg
                    aria-hidden
                    className="absolute -bottom-2 left-0 w-full"
                    height="6"
                    viewBox="0 0 200 6"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 5 Q50 1 100 4 Q150 7 200 3"
                      fill="none"
                      stroke="var(--ambre-500)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity="0.5"
                    />
                  </svg>
                </span>
              </motion.span>
            </h1>

            {/* Arabic subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className={`mt-4 ${locale === 'ar' ? 'font-sans' : 'font-display-ar'} text-xl italic`}
              style={{ color: 'rgba(255,255,255,0.32)' }}
              lang={locale === 'ar' ? 'fr' : 'ar'}
              dir={locale === 'ar' ? 'ltr' : 'rtl'}
            >
              {t('subtitleAr')}
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-6 max-w-xl text-base leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {t('descriptionUpgraded')}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.72 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href={'#demo-form' as Route}
                className="inline-flex h-12 items-center justify-center rounded-lg px-8 text-[15px] font-semibold transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: 'var(--ambre-500)',
                  color: 'var(--navy-900)',
                  boxShadow: '0 4px 24px rgba(251,177,60,0.28)',
                }}
              >
                {t('ctaPrimary')} →
              </Link>
              <Link
                href={'/login' as Route}
                className="inline-flex h-12 items-center justify-center rounded-lg border px-8 text-[15px] font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.13)' }}
              >
                {t('ctaSecondary')}
              </Link>
            </motion.div>

            {/* Trust strip */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              className="mt-8 text-[12px]"
              style={{ color: 'rgba(255,255,255,0.26)' }}
            >
              {t('trustStrip')}
            </motion.p>
          </div>

          {/* ── Mockup column ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={locale === 'ar' ? 'md:order-1' : ''}
          >
            <HeroMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
