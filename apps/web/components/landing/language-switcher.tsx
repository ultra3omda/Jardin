'use client';

import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';

import { usePathname, useRouter } from '@/i18n/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleSwitch = (newLocale: 'fr' | 'ar') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-background p-1">
      <Globe className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden />
      <button type="button" onClick={() => handleSwitch('fr')} aria-current={locale === 'fr' ? 'true' : undefined} className={`rounded px-3 py-1 text-sm font-medium transition ${locale === 'fr' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
        FR
      </button>
      <button type="button" onClick={() => handleSwitch('ar')} aria-current={locale === 'ar' ? 'true' : undefined} className={`rounded px-3 py-1 text-sm font-medium transition ${locale === 'ar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
        العربية
      </button>
    </div>
  );
}
