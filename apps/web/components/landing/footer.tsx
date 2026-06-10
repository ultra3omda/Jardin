import { useTranslations } from 'next-intl';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from './language-switcher';

const LEGAL_LINKS: ReadonlyArray<{ key: string; href: Route }> = [
  { key: 'privacy', href: '/legal/privacy' as Route },
  { key: 'terms', href: '/legal/terms' as Route },
  { key: 'legalNotice', href: '/legal/legal-notice' as Route },
  { key: 'cookies', href: '/legal/cookies' as Route },
];

interface Chapter {
  label: string;
  status: string;
}

export function Footer() {
  const t = useTranslations('landing.footer');
  const chapters = t.raw('chapters.items') as Chapter[];
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-paper-edge bg-paper-alt">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-semibold text-ink">Klasso</p>
            <p className="mt-2 text-sm text-ink-muted">{t('tagline')}</p>
            <p className="mt-6 text-xs text-ink-faded">{t('address')}</p>
            <p className="mt-1 font-mono text-xs text-ink-faded">{t('edition')}</p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink">
              {t('chapters.title')}
            </h3>
            <ul className="mt-4 space-y-2">
              {chapters.map((c, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-ink-muted">{c.label}</span>
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-faded">
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink">
              {t('legalLinks.title')}
            </h3>
            <ul className="mt-4 space-y-2">
              {LEGAL_LINKS.map(({ key, href }) => (
                <li key={key} className="text-sm">
                  <Link href={href} className="text-ink-muted hover:text-terracotta">
                    {t(`legalLinks.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink">
              {t('language')}
            </h3>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <p className="mt-12 border-t border-paper-edge pt-6 text-xs text-ink-faded">
          {t('copyright', { year })}
        </p>
      </div>
    </footer>
  );
}
