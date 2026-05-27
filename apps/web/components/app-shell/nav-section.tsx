'use client';

import { Link, usePathname } from '@/i18n/routing';

import type { NavSection as NavSectionType } from '@/lib/nav/menu';

export function NavSection({ section }: { section: NavSectionType }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-navy-700">
        {section.label}
      </div>
      {section.items.map((item) => {
        const active = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href as never}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition border-l-2 ${
              active
                ? 'bg-navy-800 border-ambre-500 text-white font-medium'
                : 'border-transparent text-[#c8cdd6] hover:bg-white/5'
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0 opacity-85" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
