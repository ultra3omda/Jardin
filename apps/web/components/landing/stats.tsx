import { useTranslations } from 'next-intl';

import { CountUp } from './atoms/count-up';
import { Section } from './atoms/section';

const ITEMS = ['rgpd', 'modules', 'languages'] as const;

export function Stats() {
  const t = useTranslations('landing.stats.items');
  return (
    <Section alt>
      <div className="grid grid-cols-1 gap-12 text-center sm:grid-cols-3">
        {ITEMS.map((key) => {
          const value = Number(t(`${key}.value`));
          const suffix = t(`${key}.suffix`);
          return (
            <div key={key} className="flex flex-col items-center">
              <span className="font-mono text-5xl font-semibold text-terracotta sm:text-6xl">
                <CountUp to={value} suffix={suffix} />
              </span>
              <span className="mt-3 font-display text-lg font-medium text-ink">{t(`${key}.label`)}</span>
              <span className="mt-1 text-sm text-ink-faded">{t(`${key}.sublabel`)}</span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
