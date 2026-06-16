'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileDown, CheckCircle2, Wallet, AlertTriangle, Receipt } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import {
  downloadInvoicePdf,
  formatAmount,
  INVOICE_STATUS_LABELS,
  type BillingStats,
  type Invoice,
  type InvoiceStatus,
} from '@/lib/api/billing';
import { computeParentStats } from '@/lib/billing/parent-stats';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { ErrorRetry } from '@/components/ui/error-retry';
import { EmptyState } from '@/components/ui/empty-state';

type LoadState = 'loading' | 'error' | 'ready';

const EMPTY_STATS: BillingStats = {
  totalBilled: 0,
  totalPaid: 0,
  totalPending: 0,
  totalOverdue: 0,
  overdueCount: 0,
  pendingCount: 0,
};

export default function PaymentsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const isParent = useAuthStore((s) => s.user?.role) === 'PARENT';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats>(EMPTY_STATS);
  const [filterStatus, setFilterStatus] = useState<'' | InvoiceStatus>('');
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const load = useCallback(async () => {
    if (!token) return;
    setLoadState('loading');
    try {
      if (isParent) {
        const res = await fetch('/api/billing/my-invoices', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items: Invoice[] };
        const items = data.items ?? [];
        setInvoices(items);
        setStats(computeParentStats(items));
        setLoadState('ready');
        return;
      }
      const [invRes, statsRes] = await Promise.all([
        fetch('/api/billing/invoices', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/billing/stats', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!invRes.ok) throw new Error(`HTTP ${invRes.status}`);
      const invData = (await invRes.json()) as { items: Invoice[] };
      const statsData = statsRes.ok ? ((await statsRes.json()) as BillingStats) : EMPTY_STATS;
      setInvoices(invData.items ?? []);
      setStats(statsData);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [token, isParent]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = filterStatus ? invoices.filter((i) => i.status === filterStatus) : invoices;

  const kpis = [
    {
      label: isParent ? 'Déjà payé' : 'Revenus encaissés',
      value: formatAmount(stats.totalPaid),
      variant: 'green' as const,
      icon: CheckCircle2,
    },
    {
      label: isParent ? 'Reste à payer' : 'En attente',
      value: formatAmount(stats.totalPending),
      variant: 'orange' as const,
      icon: Wallet,
    },
    {
      label: 'Factures en retard',
      value: String(stats.overdueCount),
      variant: 'pink' as const,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description={
          isParent
            ? 'Consultez les factures de vos enfants et leur règlement.'
            : "Consultez l'historique des paiements et règlements."
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} variant={k.variant} icon={k.icon} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="status-filter" className="sr-only">
          Filtrer par statut
        </label>
        <select
          id="status-filter"
          className="rounded-md border px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as '' | InvoiceStatus)}
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loadState === 'loading' ? (
        <TableSkeleton rows={5} cols={6} />
      ) : loadState === 'error' ? (
        <ErrorRetry message="Impossible de charger les factures." onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" aria-hidden="true" />}
          title="Aucune facture"
          description={isParent ? 'Rien à régler pour le moment.' : 'Aucune facture à afficher.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Payé le</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const isDue =
                  inv.status === 'PENDING' || inv.status === 'OVERDUE' || inv.status === 'PARTIAL';
                return (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      {isParent ? (
                        <Link
                          href={`/payments/${inv.id}` as never}
                          className="text-primary hover:underline"
                        >
                          {inv.title}
                        </Link>
                      ) : (
                        inv.title
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">{formatAmount(inv.amount, inv.currency)}</td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isParent && isDue ? (
                          <button
                            type="button"
                            disabled
                            title="Paiement en ligne bientôt disponible"
                            className="rounded-md border px-2 py-1 text-xs text-muted-foreground opacity-60"
                          >
                            Payer (bientôt)
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (token) void downloadInvoicePdf(token, inv.id).catch(() => undefined);
                          }}
                          aria-label={`Télécharger la facture ${inv.title}`}
                          title="Télécharger le PDF"
                          className="rounded p-1.5 text-ink-500 hover:bg-slate-100 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ambre-400"
                        >
                          <FileDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
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
