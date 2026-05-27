import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Section } from './atoms/section';

const ITEMS = [
  { key: 'kindergarten', icon: '/landing/icons/seedling.svg' },
  { key: 'primary', icon: '/landing/icons/book-crescent.svg' },
  { key: 'mixed', icon: '/landing/icons/buildings.svg' },
] as const;

export function SchoolSegments() {
  const t = useTranslations('landing.schoolSegments');
  return (
    <Section id="segments">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-4 text-lg text-ink-muted">{t('subtitle')}</p>
      </div>
      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {ITEMS.map(({ key, icon }) => (
          <article
            key={key}
            className="rounded-2xl border border-paper-edge bg-paper p-8 transition hover:border-terracotta hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
              <Image src={icon} alt="" width={36} height={36} />
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold text-ink">
              {t(`items.${key}.name`)}
            </h3>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-faded">
              {t(`items.${key}.ageRange`)}
            </p>
            <p className="mt-4 leading-relaxed text-ink-muted">{t(`items.${key}.description`)}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
