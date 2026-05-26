import { useTranslations } from 'next-intl';
import {
  Users,
  Heart,
  GraduationCap,
  Receipt,
  Utensils,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';

import { Section } from './atoms/section';

type Status = 'available' | 'soon' | 'later';

interface Mod {
  key: 'students' | 'parents' | 'teachers' | 'billing' | 'cantine' | 'health';
  icon: LucideIcon;
  status: Status;
}

const ITEMS: ReadonlyArray<Mod> = [
  { key: 'students', icon: Users, status: 'available' },
  { key: 'parents', icon: Heart, status: 'soon' },
  { key: 'teachers', icon: GraduationCap, status: 'soon' },
  { key: 'billing', icon: Receipt, status: 'later' },
  { key: 'cantine', icon: Utensils, status: 'later' },
  { key: 'health', icon: Stethoscope, status: 'later' },
];

const STATUS_CLASS: Record<Status, string> = {
  available: 'bg-olive/15 text-olive',
  soon: 'bg-ochre/20 text-ink',
  later: 'bg-paper-edge text-ink-faded',
};

export function ModulesGrid() {
  const t = useTranslations('landing.modules');
  return (
    <Section id="modules">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-4 text-lg text-ink-muted">{t('subtitle')}</p>
      </div>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map(({ key, icon: Icon, status }) => (
          <div
            key={key}
            className="group rounded-2xl border border-paper-edge bg-paper p-6 transition hover:border-terracotta hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta transition group-hover:rotate-[5deg]">
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[status]}`}
              >
                {t(`items.${key}.status`)}
              </span>
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold text-ink">
              {t(`items.${key}.name`)}
            </h3>
          </div>
        ))}
      </div>
    </Section>
  );
}
