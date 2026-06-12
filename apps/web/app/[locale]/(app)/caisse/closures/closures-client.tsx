'use client';

import { useClosures, formatTnd, formatDateTime } from '@/lib/api/cash-register';

const TABLE_COLUMNS = [
  'Ouverte le',
  'Clôturée le',
  'Fond',
  'Attendu',
  'Compté',
  'Écart',
];

export function ClosuresClient() {
  const { data, isLoading, isError, refetch } = useClosures();

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Chargement des clôtures">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
        <p className="text-sm text-rose-700 dark:text-rose-300">
          Impossible de charger les clôtures.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">Aucune clôture enregistrée pour l&apos;instant.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/50">
          <tr>
            {TABLE_COLUMNS.map((col) => (
              <th
                key={col}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                  col === 'Ouverte le' || col === 'Clôturée le' ? 'text-left' : 'text-right'
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((closure) => (
            <tr key={closure.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDateTime(closure.openedAt)}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDateTime(closure.closedAt)}
              </td>
              <td className="px-4 py-3 text-right text-sm tabular-nums">
                {formatTnd(closure.openingFloat)}
              </td>
              <td className="px-4 py-3 text-right text-sm tabular-nums">
                {formatTnd(closure.expectedAmount)}
              </td>
              <td className="px-4 py-3 text-right text-sm tabular-nums">
                {formatTnd(closure.countedAmount)}
              </td>
              <td
                className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${
                  closure.variance !== 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {closure.variance > 0 ? '+' : ''}
                {formatTnd(closure.variance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
