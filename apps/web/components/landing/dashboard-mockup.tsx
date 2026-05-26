import { useTranslations } from 'next-intl';

import { CountUp } from './atoms/count-up';
import { Section } from './atoms/section';

const KPIS = [
  { key: 'students', value: 247, suffix: '' },
  { key: 'classes', value: 12, suffix: '' },
  { key: 'attendance', value: 94, suffix: '%' },
  { key: 'alerts', value: 3, suffix: '' },
] as const;

export function DashboardMockup() {
  const t = useTranslations('landing.dashboardMockup');
  const activityItems = t.raw('activity.items') as string[];

  return (
    <Section alt>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-4 font-mono text-sm uppercase tracking-wider text-ink-faded">
          {t('subtitle')}
        </p>
      </div>

      <div
        className="relative mx-auto mt-14 max-w-5xl rounded-2xl border border-paper-edge bg-paper shadow-xl"
        style={{
          background:
            'linear-gradient(180deg, oklch(var(--paper)) 0%, oklch(var(--teal-deep) / 0.04) 100%)',
        }}
      >
        <div className="flex items-center gap-2 border-b border-paper-edge px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-terracotta/60" />
          <span className="h-3 w-3 rounded-full bg-ochre/60" />
          <span className="h-3 w-3 rounded-full bg-olive/60" />
          <span className="ms-4 font-mono text-xs text-ink-faded">
            klasso.tn · École Primaire Sidi Bou Saïd 🇹🇳
          </span>
        </div>

        <div className="p-6 sm:p-10">
          <p className="font-display text-2xl text-ink">{t('greeting')}</p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {KPIS.map(({ key, value, suffix }) => (
              <div key={key} className="rounded-xl border border-paper-edge bg-paper p-5">
                <div className="font-mono text-3xl font-semibold text-terracotta">
                  <CountUp to={value} suffix={suffix} />
                </div>
                <div className="mt-1 text-sm text-ink-muted">{t(`kpis.${key}`)}</div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <h3 className="font-display text-lg font-semibold text-ink">{t('activity.title')}</h3>
            <ul className="mt-4 space-y-2">
              {activityItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-ink-muted">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-terracotta" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled
            className="mt-8 inline-flex items-center rounded-md border border-paper-edge bg-paper-alt px-5 py-2 text-sm font-medium text-ink opacity-80"
          >
            {t('cta')}
          </button>
        </div>
      </div>
    </Section>
  );
}
