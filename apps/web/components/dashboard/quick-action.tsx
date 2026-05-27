import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface Props {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function QuickAction({ label, href, icon: Icon }: Props) {
  return (
    <Link
      href={href as never}
      className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink-900 shadow-sm transition hover:shadow-md"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {label}
    </Link>
  );
}
