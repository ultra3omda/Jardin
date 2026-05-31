import { useTranslations } from 'next-intl';
import { Clock, Leaf, Smartphone, Shield, MessageSquare, Upload } from 'lucide-react';

import { Eyebrow } from './atoms/eyebrow';

const ITEMS = [
  { key: 'time', icon: Clock },
  { key: 'paperless', icon: Leaf },
  { key: 'mobileParents', icon: Smartphone },
  { key: 'rgpd', icon: Shield },
  { key: 'support', icon: MessageSquare },
  { key: 'migration', icon: Upload },
] as const;

/**
 * Benefits — Médina/B signature dark navy band. Teal-tinted cards on a deep
 * navy background create the editorial contrast central to the B direction.
 */
export function Benefits() {
  const t = useTranslations('landing.benefits');
  return (
    <section className="relative isolate overflow-hidden bg-navy-900 py-20 sm:py-28">
      {/* Soft teal glow top-left for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, oklch(0.60 0.105 192 / 0.18), transparent 70%)' }}
      />
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <Eyebrow className="mb-4 [&>span]:bg-terracotta/60">Pourquoi Klasso</Eyebrow>
          <h2 className="font-display text-3xl font-medium tracking-tight text-white sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/60">{t('intro')}</p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm transition hover:border-terracotta/50 hover:bg-white/[0.06]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-terracotta/15 text-terracotta">
                <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold text-white">
                {t(`items.${key}.title`)}
              </h3>
              <p className="mt-3 leading-relaxed text-white/55">{t(`items.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
