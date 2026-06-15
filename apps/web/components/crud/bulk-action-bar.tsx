'use client';

import type { ReactNode } from 'react';

interface Props {
  count: number;
  onClear: () => void;
  /** Boutons d'action (export, suppression…). */
  children: ReactNode;
}

/** Barre d'actions groupées, visible quand des lignes sont sélectionnées. */
export function BulkActionBar({ count, onClear, children }: Props) {
  if (count === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-navy-900 px-4 py-2.5 text-sm text-white shadow-lg"
    >
      <span className="font-medium">
        {count} sélectionné{count > 1 ? 's' : ''}
      </span>
      <div className="ml-auto flex items-center gap-2">{children}</div>
      <button type="button" onClick={onClear} className="text-xs text-white/70 hover:text-white">
        Désélectionner
      </button>
    </div>
  );
}
