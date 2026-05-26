import { useTranslations } from 'next-intl';
import { Check, Clock, Calendar } from 'lucide-react';

const MODULES = [
  { key: 'students', icon: Check, color: 'emerald' },
  { key: 'parents', icon: Clock, color: 'amber' },
  { key: 'teachers', icon: Clock, color: 'amber' },
  { key: 'billing', icon: Clock, color: 'amber' },
  { key: 'cantine', icon: Calendar, color: 'gray' },
  { key: 'health', icon: Calendar, color: 'gray' },
] as const;

const colorClasses: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function ModulesGrid() {
  const t = useTranslations('landing.modules');
  return (
    <section className="bg-muted/30 py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ key, icon: Icon, color }) => (
            <div key={key} className="rounded-xl border bg-card p-6 flex items-start gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${colorClasses[color]}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{t(`items.${key}.name`)}</h3>
                <p className={`mt-1 text-sm ${color === 'emerald' ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                  {t(`items.${key}.status`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
