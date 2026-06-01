'use client';

import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface ComboOption {
  /** Stored value (e.g. email or id). */
  value: string;
  /** Primary label shown in the list and when selected. */
  label: string;
  /** Optional secondary text (email, class…) shown muted. */
  hint?: string;
}

interface Props {
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Generic searchable single-select over a known list of options (client-side
 * filter on label + hint). Use when the full list is already loaded and small
 * enough; for large server-paged lists prefer a dedicated async picker.
 */
export function ComboPicker({ options, value, onChange, placeholder, emptyText, disabled, id }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options
      .filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q))
      .slice(0, 50);
  }, [options, search]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder ?? 'Sélectionner…'}</span>
        {value ? (
          <X
            className="h-4 w-4 shrink-0 opacity-60 hover:opacity-100"
            aria-label="Effacer"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setSearch('');
            }}
          />
        ) : (
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText ?? 'Aucun résultat.'}</li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-navy-900">{o.label}</span>
                      {o.hint && <span className="ml-2 truncate text-xs text-muted-foreground">{o.hint}</span>}
                    </span>
                    {value === o.value && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
