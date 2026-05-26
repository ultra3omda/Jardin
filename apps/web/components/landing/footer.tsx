import { useTranslations } from 'next-intl';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from './language-switcher';

export function Footer() {
  const t = useTranslations('landing.footer');
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-1">
            <p className="text-lg font-bold">Klasso</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('tagline')}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{t('links.product')}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href={'#pricing' as Route} className="hover:text-foreground">{t('links.pricing')}</Link></li>
              <li><Link href={'#modules' as Route} className="hover:text-foreground">{t('links.modules')}</Link></li>
              <li><Link href={'/login' as Route} className="hover:text-foreground">{t('links.contact')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">{t('links.legal')}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href={'/mentions-legales' as Route} className="hover:text-foreground">{t('links.terms')}</Link></li>
              <li><Link href={'/privacy' as Route} className="hover:text-foreground">{t('links.privacy')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">{t('language')}</p>
            <div className="mt-3"><LanguageSwitcher /></div>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">{t('copyright')}</div>
      </div>
    </footer>
  );
}
