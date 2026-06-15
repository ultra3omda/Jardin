'use client';

import { cn } from '@/lib/utils';

export interface TabDef {
  id: string;
  label: string;
}

interface Props {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

/** Onglets accessibles (button group). Contrôlé par le parent. */
export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              isActive ? 'border-primary text-navy-900' : 'border-transparent text-ink-500 hover:text-navy-900',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
