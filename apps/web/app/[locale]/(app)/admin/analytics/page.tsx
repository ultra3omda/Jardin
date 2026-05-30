'use client';

import { ResourceListPage } from '@/components/crud/resource-list-page';
import { useResource } from '@/lib/hooks/use-resource';
import { getAnalytics, type Analytics, type CategoryCount, type GrowthPoint } from '@/lib/api/admin-analytics';

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
  const data = analytics.data;

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
      <section className="mt-4 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Revenu (MRR / ARR / churn / ARPU)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          À venir — la facturation par abonnement n'est pas encore activée. Aucun chiffre de revenu n'est
          affiché tant que les abonnements ne sont pas branchés.
        </p>
      </section>
    </ResourceListPage>
  );
}
