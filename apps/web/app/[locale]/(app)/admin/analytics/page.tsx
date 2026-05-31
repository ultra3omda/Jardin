'use client';

import { ResourceListPage } from '@/components/crud/resource-list-page';
import { useResource } from '@/lib/hooks/use-resource';
import {
  getAnalytics,
  getOverview,
  type Analytics,
  type CategoryCount,
  type GrowthPoint,
  type Overview,
} from '@/lib/api/admin-analytics';

function maxCount(rows: CategoryCount[]): number {
  return rows.reduce((max, row) => Math.max(max, row.count), 0);
}

function DistributionBars({ title, rows }: { title: string; rows: CategoryCount[] }) {
  const max = maxCount(rows);
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune donnée.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex justify-between text-sm">
                <span>{row.label}</span>
                <span className="text-muted-foreground">{row.count}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: max > 0 ? `${(row.count / max) * 100}%` : '0%' }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GrowthChart({ rows }: { rows: GrowthPoint[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.cumulativeTenants), 0);
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Croissance des établissements</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune donnée.</p>
      ) : (
        <div className="flex items-end gap-2" aria-label="Croissance cumulée par mois">
          {rows.map((point) => (
            <div key={point.month} className="flex flex-1 flex-col items-center">
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: max > 0 ? `${(point.cumulativeTenants / max) * 120}px` : '0px' }}
                title={`${point.month}: ${point.cumulativeTenants} (cumulé)`}
              />
              <span className="mt-1 text-xs text-muted-foreground">{point.month}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminAnalyticsPage() {
  const analytics = useResource<Analytics>(['admin', 'analytics'], (token) => getAnalytics(token));
  const overview = useResource<Overview>(['admin', 'overview'], (token) => getOverview(token));
  const data = analytics.data;
  const rev = overview.data;

  return (
    <ResourceListPage
      title="Analytique plateforme"
      description="Croissance et répartition des établissements et utilisateurs."
      isLoading={analytics.isLoading}
      isError={analytics.isError}
      isEmpty={false}
      onRetry={analytics.refetch}
      errorMessage="Impossible de charger l'analytique."
      emptyTitle=""
      skeletonCols={3}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <GrowthChart rows={data?.tenantGrowth ?? []} />
        <DistributionBars title="Par type d'établissement" rows={data?.tenantsByType ?? []} />
        <DistributionBars title="Par langue" rows={data?.tenantsByLocale ?? []} />
        <DistributionBars title="Utilisateurs par rôle" rows={data?.usersByRole ?? []} />
      </div>
      <section className="mt-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-navy-700">Revenu (abonnements actifs)</h3>
        {rev ? (
          <div className="mt-2 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">MRR</p>
              <p className="text-2xl font-bold text-navy-900">
                {Number(rev.mrr).toLocaleString('fr-FR')} {rev.currency}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">ARR</p>
              <p className="text-2xl font-bold text-navy-900">
                {Number(rev.arr).toLocaleString('fr-FR')} {rev.currency}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Abonnements actifs</p>
              <p className="text-2xl font-bold text-navy-900">{rev.activeSubscriptions}</p>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Chargement du revenu…</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Churn / ARPU : indicateurs à enrichir une fois l&apos;historique d&apos;abonnements constitué.
        </p>
      </section>
    </ResourceListPage>
  );
}
