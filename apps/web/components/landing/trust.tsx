import { useTranslations } from 'next-intl';
import { Shield, Server, MessageSquare, Sparkles } from 'lucide-react';

const ITEMS = [
  { key: 'rgpd', icon: Shield },
  { key: 'hosting', icon: Server },
  { key: 'support', icon: MessageSquare },
  { key: 'updates', icon: Sparkles },
] as const;

export function Trust() {
  const t = useTranslations('landing.trust');
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl">{t('title')}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ key, icon: Icon }) => (
            <div key={key} className="text-center sm:text-start">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(`items.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
