'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { listStudents, getStudent } from '@/lib/api/students';
import { requireToken } from '@/lib/auth/require-token';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { cn } from '@/lib/utils';

interface Props {
  /** Selected student id (controlled). */
  value: string;
  onChange: (studentId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Searchable student picker (combobox). Replaces raw "ID élève" text inputs.
 * Type to search by name; pick from results. Value is the student id.
 */
export function StudentPicker({ value, onChange, placeholder, disabled, id }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  // Resolve the label of the currently selected student (so the closed control
  // shows a name, not an opaque id).
  const selectedQuery = useQuery({
    queryKey: ['student', value],
    queryFn: () => getStudent(requireToken(accessToken), value),
    enabled: !!accessToken && !!value,
  });

  const resultsQuery = useQuery({
    queryKey: ['students', 'picker', search.trim()],
    queryFn: () => listStudents(requireToken(accessToken), { search: search.trim(), pageSize: 8 }),
    enabled: !!accessToken && open && search.trim().length >= 2,
  });

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selectedLabel = selectedQuery.data
    ? `${selectedQuery.data.firstName} ${selectedQuery.data.lastName}`
    : '';
  const results = resultsQuery.data?.items ?? [];

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
        <span className="truncate">
          {value ? selectedLabel || 'Élève sélectionné' : placeholder ?? 'Rechercher un élève…'}
        </span>
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
              placeholder="Nom de l'élève…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
            {search.trim().length < 2 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Saisissez au moins 2 caractères.</li>
            ) : resultsQuery.isLoading ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Recherche…</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Aucun élève pour « {search} ».</li>
            ) : (
              results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(s.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <span>
                      <span className="font-medium text-navy-900">
                        {s.firstName} {s.lastName}
                      </span>
                      {s.classroom && (
                        <span className="ml-2 text-xs text-muted-foreground">{s.classroom}</span>
                      )}
                    </span>
                    {value === s.id && <Check className="h-4 w-4 text-primary" aria-hidden />}
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
