import { useTranslations } from 'next-intl';

import { Section } from './atoms/section';

interface QA {
  q: string;
  a: string;
}

export function Faq() {
  const t = useTranslations('landing.faq');
  const items = t.raw('items') as QA[];

  return (
    <Section id="faq">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-ink-muted">{t('subtitle')}</p>
        </div>
        <div className="mt-12 divide-y divide-paper-edge border-y border-paper-edge">
          {items.map((item, i) => (
            <details key={i} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-medium text-ink">
                <span>{item.q}</span>
                <span
                  aria-hidden
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-paper-edge text-ink-muted transition group-open:rotate-45 group-open:border-terracotta group-open:text-terracotta"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
