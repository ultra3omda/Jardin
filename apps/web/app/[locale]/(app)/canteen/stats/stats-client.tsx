'use client';

import { useMemo, useState } from 'react';

import {
  useCanteenStats,
  formatDate,
  todayInput,
  dayOffsetInput,
} from '@/lib/api/canteen-reservation';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const SELECT =
  'h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

const REGIME_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  VEGETARIAN: 'Végétarien',
  HALAL: 'Halal',
  NO_PORK: 'Sans porc',
  OTHER: 'Autre',
};

function regimeLabel(regime: string): string {
  return REGIME_LABELS[regime] ?? regime;
}

export function StatsClient() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  const [from, setFrom] = useState(dayOffsetInput(-7));
  const [to, setTo] = useState(todayInput());

  const { data, isLoading, isError, refetch } = useCanteenStats(from, to, {
    enabled: !!from && !!to,
  });

  const maxPerDay = useMemo(
    () => Math.max(1, ...(data?.perDay ?? []).map((d) => d.count)),
    [data],
  );
  const totalRegimes = useMemo(
    () => (data?.regimes ?? []).reduce((sum, r) => sum + r.count, 0),
    [data],
  );

  if (!canManage) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Accès non autorisé : les statistiques de la cantine sont réservées à la direction et au
        personnel.
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="stats-from" className="mb-1 block text-xs font-medium text-muted-foreground">
            Du
          </label>
          <input
            id="stats-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className={SELECT}
          />
        </div>
        <div>
          <label htmlFor="stats-to" className="mb-1 block text-xs font-medium text-muted-foreground">
            Au
          </label>
          <input
            id="stats-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className={SELECT}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2" role="status" aria-label="Chargement des statistiques">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger les statistiques.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            Réessayer
          </button>
        </div>
      ) : !data || (data.perDay.length === 0 && data.regimes.length === 0) ? (
        <div className="mt-6 rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune réservation sur cette période.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Meals per day */}
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Repas par jour
            </h2>
            {data.perDay.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.perDay.map((d) => (
                  <li key={d.date} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm tabular-nums text-muted-foreground">
                      {formatDate(d.date)}
                    </span>
                    <div
                      className="h-3 flex-1 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${d.count} repas le ${formatDate(d.date)}`}
                    >
                      <div
                        className="h-full rounded-full bg-navy-600"
                        style={{ width: `${(d.count / maxPerDay) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">
                      {d.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Regimes breakdown */}
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Répartition par régime
            </h2>
            {data.regimes.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <table className="mt-4 min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Régime
                    </th>
                    <th
                      scope="col"
                      className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Repas
                    </th>
                    <th
                      scope="col"
                      className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Part
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.regimes.map((r) => (
                    <tr key={r.regime}>
                      <td className="py-2 text-sm font-medium">{regimeLabel(r.regime)}</td>
                      <td className="py-2 text-right text-sm tabular-nums">{r.count}</td>
                      <td className="py-2 text-right text-sm tabular-nums text-muted-foreground">
                        {totalRegimes > 0 ? Math.round((r.count / totalRegimes) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </>
  );
}
