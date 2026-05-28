'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getBillingStats,
  listInvoices,
  formatAmount,
  formatDate,
  invoiceNumber,
  type BillingStats,
  type Invoice,
  type InvoiceStatus,
  type ListInvoicesResponse,
  INVOICE_STATUS_LABELS,
} from '@/lib/api/billing';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { InvoiceStatusBadge } from './_components/invoice-status-badge';
import { CreateInvoiceModal } from './_components/create-invoice-modal';
import { RecordPaymentModal } from './_components/record-payment-modal';

const PAGE_SIZE = 10;

// ─── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_BILLING_STATS: BillingStats = {
  totalBilled: 45800,
  totalPaid: 32600,
  totalPending: 8200,
  totalOverdue: 5000,
  overdueCount: 3,
  pendingCount: 5,
};

const DEMO_INVOICES: Invoice[] = [
  { id: 'dinv-1', tenantId: 'demo', studentId: 'ds-3-1', title: 'Frais de scolarité T1 2025-2026', amount: 1200, currency: 'TND', status: 'PAID', dueDate: '2025-10-15', paidAt: '2025-10-10', notes: null, createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-10-10T12:00:00Z', studentName: 'Ibrahima Ba' },
  { id: 'dinv-2', tenantId: 'demo', studentId: 'ds-3-2', title: 'Frais de scolarité T1 2025-2026', amount: 1200, currency: 'TND', status: 'PAID', dueDate: '2025-10-15', paidAt: '2025-10-08', notes: null, createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-10-08T11:00:00Z', studentName: 'Yasmine Gharbi' },
  { id: 'dinv-3', tenantId: 'demo', studentId: 'ds-3-3', title: 'Frais de scolarité T1 2025-2026', amount: 1200, currency: 'TND', status: 'PENDING', dueDate: '2025-10-15', paidAt: null, notes: null, createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-09-01T08:00:00Z', studentName: 'Khalil Mejri' },
  { id: 'dinv-4', tenantId: 'demo', studentId: 'ds-4-1', title: 'Frais de scolarité T1 2025-2026', amount: 1400, currency: 'TND', status: 'OVERDUE', dueDate: '2025-10-01', paidAt: null, notes: null, createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-09-01T08:00:00Z', studentName: 'Nour Karoui' },
  { id: 'dinv-5', tenantId: 'demo', studentId: 'ds-4-2', title: 'Cantine scolaire Oct 2025', amount: 180, currency: 'TND', status: 'PAID', dueDate: '2025-10-05', paidAt: '2025-10-03', notes: null, createdAt: '2025-09-30T08:00:00Z', updatedAt: '2025-10-03T09:00:00Z', studentName: 'Pierre Simon' },
  { id: 'dinv-6', tenantId: 'demo', studentId: 'ds-1-1', title: 'Transport scolaire T1 2025-2026', amount: 320, currency: 'TND', status: 'PARTIAL', dueDate: '2025-10-30', paidAt: null, notes: null, createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-10-15T10:00:00Z', studentName: 'Léa Fontaine' },
  { id: 'dinv-7', tenantId: 'demo', studentId: 'ds-1-2', title: 'Activités périscolaires T1', amount: 250, currency: 'TND', status: 'PENDING', dueDate: '2025-11-15', paidAt: null, notes: null, createdAt: '2025-10-01T08:00:00Z', updatedAt: '2025-10-01T08:00:00Z', studentName: 'Adam Saidi' },
  { id: 'dinv-8', tenantId: 'demo', studentId: 'ds-2-1', title: 'Frais de scolarité T1 2025-2026', amount: 1200, currency: 'TND', status: 'OVERDUE', dueDate: '2025-09-30', paidAt: null, notes: null, createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-09-01T08:00:00Z', studentName: 'Ines Gharbi' },
  { id: 'dinv-9', tenantId: 'demo', studentId: 'ds-2-2', title: 'Assurance scolaire 2025-2026', amount: 85, currency: 'TND', status: 'PAID', dueDate: '2025-10-01', paidAt: '2025-09-28', notes: null, createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-09-28T08:00:00Z', studentName: 'Mehdi Ben Ali' },
  { id: 'dinv-10', tenantId: 'demo', studentId: 'ds-4-3', title: 'Frais de scolarité T1 2025-2026', amount: 1400, currency: 'TND', status: 'OVERDUE', dueDate: '2025-10-01', paidAt: null, notes: null, createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-09-01T08:00:00Z', studentName: 'Dina Belhaj' },
];

const DEMO_INVOICES_RESPONSE: ListInvoicesResponse = {
  items: DEMO_INVOICES,
  total: DEMO_INVOICES.length,
  page: 1,
  limit: PAGE_SIZE,
};

// ─────────────────────────────────────────────────────────────────────────────

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
    // Fall back to demo stats silently so KPI cards are never blank
    queryFn: () => getBillingStats(accessToken!).catch(() => DEMO_BILLING_STATS),
    enabled: !!accessToken,
  });

  const { data, isLoading, error } = useQuery({
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

  // Use demo invoices when the API errors or returns empty (and no active filter)
  const effectiveData = (() => {
    if (isLoading) return undefined;
    if ((error || !data || data.total === 0) && !statusFilter && !debounced) return DEMO_INVOICES_RESPONSE;
    return data;
  })();

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          className="h-10 w-64 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
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
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm font-medium">
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
