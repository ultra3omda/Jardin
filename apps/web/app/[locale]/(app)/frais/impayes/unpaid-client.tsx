'use client';

import { useMemo, useState } from 'react';

import { useUnpaid, useRemindUnpaid, formatTnd, formatDate } from '@/lib/api/fees';
import { useToast } from '@/lib/ui/use-toast';

const TABLE_COLUMNS = ['Élève', 'Frais', 'Échéance', 'Date', 'Montant', 'État'];

export function UnpaidClient() {
  const { data, isLoading, isError, refetch } = useUnpaid();
  const remindMutation = useRemindUnpaid();
  const toast = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = data ?? [];
  const allSelected = rows.length > 0 && selected.size === rows.length;

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.installmentId)));
  }

  function handleRemind() {
    if (selectedIds.length === 0) return;
    remindMutation.mutate(selectedIds, {
      onSuccess: (res) => {
        toast.success(`${res.sent} rappels envoyés`);
        setSelected(new Set());
      },
      onError: () => toast.error('Envoi des rappels impossible.'),
    });
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {selectedIds.length > 0
            ? `${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''}`
            : `${rows.length} impayé${rows.length > 1 ? 's' : ''}`}
        </p>
        <button
          type="button"
          onClick={handleRemind}
          disabled={selectedIds.length === 0 || remindMutation.isPending}
          className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
        >
          {remindMutation.isPending ? 'Envoi…' : 'Relancer la sélection'}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Chargement des impayés">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger les impayés.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            Réessayer
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun impayé. Toutes les échéances sont réglées. 🎉
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
                {TABLE_COLUMNS.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                      col === 'Montant' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const isChecked = selected.has(row.installmentId);
                return (
                  <tr key={row.installmentId} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(row.installmentId)}
                        aria-label={`Sélectionner l'impayé de ${row.studentName}`}
                        className="h-4 w-4 rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{row.studentName}</td>
                    <td className="px-4 py-3 text-sm">{row.feeName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.label}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{formatDate(row.dueDate)}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {formatTnd(row.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {row.overdue ? (
                        <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
                          En retard
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          À venir
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
