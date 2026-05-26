import { useTranslations } from 'next-intl';
import { Clock, Leaf, Smartphone, Shield, MessageSquare, Upload } from 'lucide-react';

import { DropCap } from './atoms/drop-cap';
import { Section } from './atoms/section';

const ITEMS = [
  { key: 'time', icon: Clock },
  { key: 'paperless', icon: Leaf },
  { key: 'mobileParents', icon: Smartphone },
  { key: 'rgpd', icon: Shield },
  { key: 'support', icon: MessageSquare },
  { key: 'migration', icon: Upload },
] as const;

export function Benefits() {
  const t = useTranslations('landing.benefits');
  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {t('title')}
        </h2>
        <DropCap className="mt-6 text-lg leading-relaxed text-ink-muted">{t('intro')}</DropCap>
      </div>
      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="rounded-2xl border border-paper-edge bg-paper p-8 transition hover:border-terracotta hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
              <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold text-ink">
              {t(`items.${key}.title`)}
            </h3>
            <p className="mt-3 leading-relaxed text-ink-muted">{t(`items.${key}.description`)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
