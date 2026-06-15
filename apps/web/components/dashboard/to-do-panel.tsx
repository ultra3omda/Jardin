import type { LucideIcon } from 'lucide-react';

import { Link } from '@/i18n/routing';

export interface ToDoItem {
  id: string;
  icon: LucideIcon;
  /** Grande valeur (compte ou montant), ex. "3" ou "1250 TND". */
  value: string;
  /** Libellé de l'item, ex. "paiements en retard". */
  label: string;
  /** Ligne secondaire optionnelle. */
  detail?: string;
  href: string;
  cta: string;
  tone: 'danger' | 'warn' | 'info';
}

const TONE: Record<ToDoItem['tone'], string> = {
  danger: 'bg-red-50 text-red-700',
  warn: 'bg-amber-50 text-amber-700',
  info: 'bg-sky-50 text-sky-700',
};

/** "À traiter aujourd'hui" — actions prioritaires en tête du dashboard. */
export function ToDoPanel({ items }: { items: ToDoItem[] }) {
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm" aria-label="À traiter aujourd'hui">
      <h2 className="mb-3 text-sm font-bold text-ink-900">À traiter aujourd&apos;hui</h2>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-ink-300">Rien d&apos;urgent — tout est à jour.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE[it.tone]}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">
                    {it.value} · {it.label}
                  </p>
                  {it.detail ? <p className="truncate text-xs text-ink-400">{it.detail}</p> : null}
                </div>
                <Link
                  href={it.href as never}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {it.cta}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
