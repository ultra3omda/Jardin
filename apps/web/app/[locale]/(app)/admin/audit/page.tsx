'use client';

import { useMemo, useState } from 'react';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { useResource } from '@/lib/hooks/use-resource';
import { listAudit, type AuditQuery } from '@/lib/api/admin-audit';
import { listTenants, type TenantSummary } from '@/lib/api/admin-tenants';

const PAGE_SIZE = 25;

export default function AdminAuditPage() {
  const [action, setAction] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const query: AuditQuery = useMemo(
    () => ({
      action: action.trim() || undefined,
      tenantId: tenantId || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [action, tenantId, from, to, page],
  );

  const tenants = useResource<TenantSummary[]>(['admin', 'tenants', 'options'], (token) =>
    listTenants(token),
  );

  const audit = useResource(['admin', 'audit', JSON.stringify(query)], (token) =>
    listAudit(token, query),
  );

  const items = audit.data?.items ?? [];
  const total = audit.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <ResourceListPage
      title="Journal d’audit"
      description="Événements de la plateforme, tous établissements confondus."
      isLoading={audit.isLoading}
      isError={audit.isError}
      isEmpty={items.length === 0}
      onRetry={audit.refetch}
      errorMessage="Impossible de charger le journal d’audit."
      emptyTitle="Aucun événement"
      emptyDescription="Aucun événement ne correspond à ces filtres."
      skeletonCols={5}
      action={
        <form
          className="flex flex-wrap items-end gap-3"
          aria-label="Filtres du journal d’audit"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Action</span>
            <input
              type="text"
              value={action}
              onChange={(e) => resetToFirstPage(setAction)(e.target.value)}
              placeholder="ex. admin.tenant"
              className="rounded-md border px-2 py-1"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Établissement</span>
            <select
              value={tenantId}
              onChange={(e) => resetToFirstPage(setTenantId)(e.target.value)}
              disabled={tenants.isLoading || tenants.isError}
              className="rounded-md border px-2 py-1"
            >
              <option value="">Tous</option>
              {(tenants.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Du</span>
            <input
              type="date"
              value={from}
              onChange={(e) => resetToFirstPage(setFrom)(e.target.value)}
              className="rounded-md border px-2 py-1"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Au</span>
            <input
              type="date"
              value={to}
              onChange={(e) => resetToFirstPage(setTo)(e.target.value)}
              className="rounded-md border px-2 py-1"
            />
          </label>
        </form>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Journal d’audit">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Acteur</th>
              <th className="py-2 pr-4">Établissement</th>
              <th className="py-2 pr-4">IP</th>
              <th className="py-2 pr-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono text-xs">{entry.action}</td>
                <td className="py-2 pr-4">{entry.userEmail ?? '—'}</td>
                <td className="py-2 pr-4">{entry.tenantName ?? '—'}</td>
                <td className="py-2 pr-4 font-mono text-xs">{entry.ip ?? '—'}</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex items-center justify-between" aria-label="Pagination du journal">
        <span className="text-sm text-muted-foreground">
          {total} événement(s) — page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </nav>
    </ResourceListPage>
  );
}
