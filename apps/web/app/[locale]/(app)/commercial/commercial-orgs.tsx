'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

import { Link } from '@/i18n/routing';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { listOrganizations, type OrganizationSummary } from '@/lib/api/commercial';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const STATUS_BADGE: Record<OrganizationSummary['status'], { text: string; className: string }> = {
  PENDING_ONBOARDING: { text: 'Onboarding en attente', className: 'bg-amber-100 text-amber-800' },
  ACTIVE: { text: 'Active', className: 'bg-emerald-100 text-emerald-800' },
  SUSPENDED: { text: 'Suspendue', className: 'bg-rose-100 text-rose-800' },
};

const INVITE_LABEL: Record<NonNullable<OrganizationSummary['inviteStatus']> | 'none', string> = {
  pending: 'Invitation envoyée',
  consumed: 'Compte admin créé',
  expired: 'Invitation expirée',
  none: '—',
};

export function CommercialOrgsList() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['commercial', 'organizations'],
    queryFn: () => listOrganizations(accessToken!),
    enabled: !!accessToken,
  });

  const rows = data ?? [];

  return (
    <ResourceListPage
      title="Organisations"
      description="Les établissements que vous avez signés et leur état d'onboarding."
      action={
        <Link
          href="/commercial/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Nouvelle organisation signée
        </Link>
      }
      isLoading={isLoading}
      isError={isError}
      isEmpty={rows.length === 0}
      onRetry={() => void refetch()}
      errorMessage="Impossible de charger les organisations."
      emptyTitle="Aucune organisation signée"
      emptyDescription="Les établissements que vous signez apparaîtront ici."
      emptyIcon={<Building2 className="h-8 w-8" aria-hidden="true" />}
      skeletonCols={5}
    >
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <Th>Nom</Th>
              <Th>Slug</Th>
              <Th>Statut</Th>
              <Th>Admin</Th>
              <Th>Contrats</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((o) => {
              const badge = STATUS_BADGE[o.status];
              return (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{o.name}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{o.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                      {badge.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {INVITE_LABEL[o.inviteStatus ?? 'none']}
                  </td>
                  <td className="px-4 py-3 text-sm">{o.contractsCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ResourceListPage>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  );
}
