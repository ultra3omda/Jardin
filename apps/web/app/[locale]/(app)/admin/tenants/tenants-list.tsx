'use client';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/routing';

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

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => listTenants(accessToken!),
    enabled: !!accessToken,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (error) return <p className="text-sm text-rose-600">Erreur : {(error as Error).message}</p>;
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucune école pour l&apos;instant.</p>
        <Link href="/admin/tenants/new" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Créer la première école →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
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
          {data.map((t) => {
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
  );
}
