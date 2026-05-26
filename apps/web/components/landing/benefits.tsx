import { useTranslations } from 'next-intl';
import { Users, MessageCircle, BookOpen } from 'lucide-react';

const ITEMS = [
  { key: 'students', icon: Users },
  { key: 'communication', icon: MessageCircle },
  { key: 'pedagogy', icon: BookOpen },
] as const;

export function Benefits() {
  const t = useTranslations('landing.benefits');
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl">{t('title')}</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ key, icon: Icon }) => (
            <div key={key} className="rounded-2xl border bg-card p-8 shadow-sm transition hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-6 text-xl font-semibold">{t(`items.${key}.title`)}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{t(`items.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
