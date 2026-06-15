'use client';

import type { NavSection } from '@/lib/nav/menu';

interface Props {
  sections: NavSection[];
  activeId: string;
  onSelect: (id: string) => void;
}

/** Niveau 1 : colonne d'icônes/labels de domaines (navy). */
export function DomainRail({ sections, activeId, onSelect }: Props) {
  return (
    <nav aria-label="Domaines" className="flex w-[112px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/5 py-3">
      {sections.map((s) => {
        const Icon = s.items[0]?.icon;
        const active = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-current={active ? 'true' : undefined}
            className={`mx-2 flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] ${
              active ? 'bg-white/10 text-white' : 'text-[#c8cdd6] hover:bg-white/5 hover:text-white'
            }`}
          >
            {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
            <span className="text-center leading-tight">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
