import { useTranslations } from 'next-intl';
import { Shield, Server, MessageCircle, RefreshCw, type LucideIcon } from 'lucide-react';

import { Section } from './atoms/section';

interface Item {
  key: 'rgpd' | 'hosting' | 'support' | 'updates';
  icon: LucideIcon;
}

const ITEMS: ReadonlyArray<Item> = [
  { key: 'rgpd', icon: Shield },
  { key: 'hosting', icon: Server },
  { key: 'support', icon: MessageCircle },
  { key: 'updates', icon: RefreshCw },
];

export function Trust() {
  const t = useTranslations('landing.trust');
  return (
    <Section>
      <h2 className="text-center font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        {t('title')}
      </h2>
      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, icon: Icon }) => (
          <div key={key} className="flex flex-col">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-olive/15 text-olive">
              <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold text-ink">
              {t(`items.${key}.title`)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {t(`items.${key}.description`)}
            </p>
            <p className="mt-3 font-mono text-xs text-ink-faded">{t(`items.${key}.proof`)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
