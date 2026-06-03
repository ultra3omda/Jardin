import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import type { KpiVariant } from '@/lib/dashboard/config';

const ICON_BG: Record<KpiVariant, string> = {
  blue:   'bg-gradient-to-br from-blue-500 to-blue-700',
  green:  'bg-gradient-to-br from-emerald-500 to-emerald-700',
  orange: 'bg-gradient-to-br from-ambre-500 to-ambre-600',
  amber:  'bg-gradient-to-br from-amber-400 to-amber-600',
  pink:   'bg-gradient-to-br from-pink-500 to-pink-700',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-700',
};

interface Props {
  label: string;
  value: ReactNode;
  variant: KpiVariant;
  icon: LucideIcon;
  sub?: string;
  /** When set, the whole card becomes a link to this route. */
  href?: string;
}

export function KpiCard({ label, value, variant, icon: Icon, sub, href }: Props) {
  const inner = (
    <>
      <div className="mb-4 flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">{label}</div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ICON_BG[variant]}`}>
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
      </div>
      <div className="text-3xl font-extrabold leading-none text-ink-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href as never}
        className="block rounded-2xl bg-surface p-4 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ambre-400"
      >
        {inner}
      </Link>
    );
  }

  return <div className="rounded-2xl bg-surface p-4 shadow-sm">{inner}</div>;
}
