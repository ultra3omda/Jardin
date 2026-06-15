'use client';

import { useState, type ReactNode } from 'react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Tabs, type TabDef } from '@/components/ui/tabs';

interface Props {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  avatar?: { initials: string; className?: string };
  actions?: ReactNode;
  tabs: TabDef[];
  panels: Record<string, ReactNode>;
  defaultTab?: string;
}

/** Gabarit de fiche : retour + header (+ avatar/actions) + onglets + contenu. */
export function DetailPage({ backHref, backLabel, title, subtitle, avatar, actions, tabs, panels, defaultTab }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '');
  return (
    <div className="space-y-5">
      <Link href={backHref as never} className="text-sm font-medium text-primary hover:underline">
        ← {backLabel}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatar ? (
            <span className={cn('flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold', avatar.className ?? 'bg-paper-100 text-navy-900')}>
              {avatar.initials}
            </span>
          ) : null}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>

      {tabs.length > 1 ? <Tabs tabs={tabs} active={active} onChange={setActive} /> : null}
      <div role="tabpanel">{panels[active]}</div>
    </div>
  );
}
