'use client';

import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';

import { usePathname, useRouter } from '@/i18n/routing';
import { locales, type Locale } from '@/i18n';

const LABELS: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
  es: 'ES',
  ar: 'العربية',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleSwitch = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-background p-1">
      <Globe className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden />
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => handleSwitch(loc)}
          aria-current={locale === loc ? 'true' : undefined}
          className={`rounded px-3 py-1 text-sm font-medium transition ${
            locale === loc
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {LABELS[loc]}
        </button>
      ))}
    </div>
  );
}
