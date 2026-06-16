'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

import { Link } from '@/i18n/routing';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { listTenants, type TenantSummary } from '@/lib/api/admin-tenants';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const STATUS_LABEL: Record<NonNullable<TenantSummary['inviteStatus']> | 'none', { text: string; className: string }> = {
  pending: { text: 'En attente', className: 'bg-amber-100 text-amber-800' },
  consumed: { text: 'Admin actif', className: 'bg-emerald-100 text-emerald-800' },
  expired: { text: 'Expirée', className: 'bg-rose-100 text-rose-800' },
  none: { text: '—', className: 'bg-gray-100 text-gray-600' },
};

export function TenantsList() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => listTenants(accessToken!),
    enabled: !!accessToken,
  });

  const rows = data ?? [];

  return (
    <ResourceListPage
      title="Écoles"
      description="Liste des établissements sur la plateforme Klasso."
      action={
        <Link
          href="/admin/tenants/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nouvelle école
        </Link>
      }
      isLoading={isLoading}
      isError={isError}
      isEmpty={rows.length === 0}
      onRetry={() => void refetch()}
      errorMessage="Impossible de charger les établissements."
      emptyTitle="Aucun établissement"
      emptyDescription="Les écoles créées sur la plateforme apparaîtront ici."
      emptyIcon={<Building2 className="h-8 w-8" aria-hidden="true" />}
      skeletonCols={6}
    >
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Users</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invitation</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((t) => {
              const status = STATUS_LABEL[t.inviteStatus ?? 'none'];
              return (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{t.slug}</td>
                  <td className="px-4 py-3 text-sm">{t.type}</td>
                  <td className="px-4 py-3 text-sm">{t.usersCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/tenants/${t.id}`} className="text-sm font-medium text-primary hover:underline">
                      Détail →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ResourceListPage>
  );
}
