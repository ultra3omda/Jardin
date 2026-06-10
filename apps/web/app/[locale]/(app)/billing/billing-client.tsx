'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getBillingStats,
  listInvoices,
  downloadInvoicePdf,
  formatAmount,
  formatDate,
  invoiceNumber,
  type BillingStats,
  type Invoice,
  type InvoiceStatus,
  INVOICE_STATUS_LABELS,
} from '@/lib/api/billing';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useToast } from '@/lib/ui/use-toast';
import { InvoiceStatusBadge } from './_components/invoice-status-badge';
import { CreateInvoiceModal } from './_components/create-invoice-modal';
import { RecordPaymentModal } from './_components/record-payment-modal';

const PAGE_SIZE = 10;

const EMPTY_BILLING_STATS: BillingStats = {
  totalBilled: 0,
  totalPaid: 0,
  totalPending: 0,
  totalOverdue: 0,
  overdueCount: 0,
  pendingCount: 0,
};

const STATUS_OPTIONS: Array<{ value: '' | InvoiceStatus; label: string }> = [
  { value: '', label: 'Tous les statuts' },
  { value: 'PENDING', label: INVOICE_STATUS_LABELS.PENDING },
  { value: 'PARTIAL', label: INVOICE_STATUS_LABELS.PARTIAL },
  { value: 'PAID', label: INVOICE_STATUS_LABELS.PAID },
  { value: 'OVERDUE', label: INVOICE_STATUS_LABELS.OVERDUE },
  { value: 'CANCELLED', label: INVOICE_STATUS_LABELS.CANCELLED },
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  colorClass: string;
  icon: string;
}

function KpiCard({ label, value, sub, colorClass, icon }: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs opacity-70">{sub}</p>}
    </div>
  );
}

// ─── Main client component ───────────────────────────────────────────────────

interface Props {
  /** Signals the page header's "+ Nouvelle facture" button was clicked. */
  initialCreateOpen?: boolean;
}

export function BillingClient({ initialCreateOpen = false }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'' | InvoiceStatus>('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);
  const toast = useToast();

  async function handleDownloadPdf(invoiceId: string): Promise<void> {
    if (!accessToken) return;
    setPdfBusyId(invoiceId);
    try {
      await downloadInvoicePdf(accessToken, invoiceId);
    } catch {
      toast.error('Téléchargement du PDF impossible.');
    } finally {
      setPdfBusyId(null);
    }
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const { data: stats } = useQuery({
    queryKey: ['billing-stats'],
    // Fall back to zeroed stats so KPI cards are never blank on error
    queryFn: () => getBillingStats(accessToken!).catch(() => EMPTY_BILLING_STATS),
    enabled: !!accessToken,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['billing-invoices', page, statusFilter, debounced],
    queryFn: () =>
      listInvoices(accessToken!, {
        status: statusFilter || undefined,
        studentId: debounced || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: !!accessToken,
  });

  const effectiveData = isLoading ? undefined : data;

  const totalPages = effectiveData ? Math.max(1, Math.ceil(effectiveData.total / PAGE_SIZE)) : 1;

  return (
    <>
      {/* "+ Nouvelle facture" button — kept in client so it can toggle state */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
        >
          + Nouvelle facture
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total facturé"
          value={stats ? formatAmount(stats.totalBilled) : '—'}
          colorClass="bg-navy-900 text-white border-navy-700"
          icon="🧾"
        />
        <KpiCard
          label="Encaissé"
          value={stats ? formatAmount(stats.totalPaid) : '—'}
          colorClass="bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800"
          icon="✅"
        />
        <KpiCard
          label="En attente"
          value={stats ? formatAmount(stats.totalPending) : '—'}
          sub={
            stats
              ? `${stats.pendingCount} facture${stats.pendingCount > 1 ? 's' : ''}`
              : undefined
          }
          colorClass="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800"
          icon="⏳"
        />
        <KpiCard
          label="En retard"
          value={stats ? formatAmount(stats.totalOverdue) : '—'}
          sub={
            stats
              ? `${stats.overdueCount} facture${stats.overdueCount > 1 ? 's' : ''}`
              : undefined
          }
          colorClass="bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800"
          icon="⚠️"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | InvoiceStatus)}
          aria-label="Filtrer par statut"
          className="h-10 rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 dark:bg-navy-800"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par ID élève…"
          aria-label="Rechercher par ID élève"
          className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 sm:w-64"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Chargement…
        </p>
      ) : !effectiveData || effectiveData.total === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {statusFilter || debounced
              ? 'Aucune facture ne correspond aux filtres.'
              : "Aucune facture pour l'instant."}
          </p>
          {!statusFilter && !debounced && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Créer la première facture →
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {['N°', 'Élève', 'Titre', 'Montant', 'Échéance', 'Statut', 'Actions'].map(
                  (col) => (
                    <th
                      key={col}
                      scope="col"
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                        col === 'Actions' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {effectiveData.items.map((inv, idx) => {
                const rowNum = invoiceNumber((page - 1) * PAGE_SIZE + idx);
                const studentLabel = inv.studentName
                  ?? (inv.studentId ? inv.studentId.slice(0, 8) : '—');
                return (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                      {rowNum}
                    </td>
                    <td className="px-4 py-3 text-sm">{studentLabel}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-sm font-medium sm:max-w-[200px]">
                      {inv.title}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums">
                      {formatAmount(inv.amount, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Télécharger le PDF de la facture ${rowNum}`}
                          title="Télécharger le PDF"
                          onClick={() => void handleDownloadPdf(inv.id)}
                          disabled={pdfBusyId === inv.id}
                          className="rounded p-1 text-base hover:bg-muted disabled:opacity-50"
                        >
                          {pdfBusyId === inv.id ? '⏳' : '📄'}
                        </button>
                        <button
                          type="button"
                          aria-label={`Voir la facture ${rowNum}`}
                          title="Voir"
                          className="rounded p-1 text-base hover:bg-muted"
                        >
                          👁
                        </button>
                        <button
                          type="button"
                          aria-label={`Modifier la facture ${rowNum}`}
                          title="Modifier"
                          className="rounded p-1 text-base hover:bg-muted"
                        >
                          ✏️
                        </button>
                        {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            aria-label={`Enregistrer un paiement pour la facture ${rowNum}`}
                            title="Paiement"
                            onClick={() => setPaymentTarget(inv)}
                            className="rounded p-1 text-base hover:bg-muted"
                          >
                            💳
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {effectiveData && totalPages > 1 && (
        <nav
          className="flex items-center justify-between text-sm"
          aria-label="Pagination des factures"
        >
          <span className="text-muted-foreground">
            {effectiveData.total} facture{effectiveData.total > 1 ? 's' : ''} · page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 rounded-md border px-3 disabled:opacity-50"
            >
              ← Précédent
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-9 rounded-md border px-3 disabled:opacity-50"
            >
              Suivant →
            </button>
          </div>
        </nav>
      )}

      {/* Modals */}
      <CreateInvoiceModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <RecordPaymentModal invoice={paymentTarget} onClose={() => setPaymentTarget(null)} />
    </>
  );
}
