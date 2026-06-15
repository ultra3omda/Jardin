'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import type { NavSection } from '@/lib/nav/menu';
import { isItemActive } from '@/lib/nav/active';

interface Props {
  section: NavSection | undefined;
  onNavigate?: () => void;
}

/** Niveau 2 : entrées du domaine sélectionné. */
export function DomainPanel({ section, onNavigate }: Props) {
  const pathname = usePathname() ?? '';
  if (!section) return null;
  return (
    <nav aria-label={section.label} className="flex-1 overflow-y-auto px-2 py-3">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500">{section.label}</p>
      {section.items.map((item) => {
        const active = isItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
              active ? 'bg-navy-800 text-white' : 'text-[#c8cdd6] hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
