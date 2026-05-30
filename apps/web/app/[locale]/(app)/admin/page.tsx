'use client';

import { Link } from '@/i18n/routing';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { useResource } from '@/lib/hooks/use-resource';
import { getOverview, type Overview } from '@/lib/api/admin-analytics';

interface StatCard {
  label: string;
  value: number;
}

export default function AdminOverviewPage() {
  const overview = useResource<Overview>(['admin', 'overview'], (token) => getOverview(token));

  const cards: StatCard[] = overview.data
    ? [
        { label: 'Établissements', value: overview.data.tenants },
        { label: 'Utilisateurs', value: overview.data.users },
        { label: 'Élèves', value: overview.data.students },
        { label: 'Demandes de démo en attente', value: overview.data.pendingDemoRequests },
      ]
    : [];

  return (
    <ResourceListPage
      title="Tableau de bord plateforme"
      description="Vue d'ensemble de tous les établissements."
      isLoading={overview.isLoading}
      isError={overview.isError}
      isEmpty={false}
      onRetry={overview.refetch}
      errorMessage="Impossible de charger les indicateurs de la plateforme."
      emptyTitle=""
      skeletonCols={4}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold text-navy-900">{card.value}</p>
          </div>
        ))}
        <div className="rounded-xl border border-dashed bg-white p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Revenu mensuel récurrent (MRR)</p>
          <p className="mt-1 text-lg font-medium text-muted-foreground">À venir</p>
          <p className="mt-1 text-xs text-muted-foreground">
            La facturation par abonnement n&apos;est pas encore activée.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/tenants"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Gérer les établissements
        </Link>
        <Link
          href="/admin/demo"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Demandes de démo
        </Link>
        <Link
          href="/admin/analytics"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Analytique
        </Link>
        <Link
          href="/admin/audit"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Journal d&apos;audit
        </Link>
      </div>
    </ResourceListPage>
  );
}
