'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileDown } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { downloadInvoicePdf, formatAmount, formatDate, type Invoice } from '@/lib/api/billing';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { DetailPage } from '@/components/crud/detail-page';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { ErrorRetry } from '@/components/ui/error-retry';
import { EmptyState } from '@/components/ui/empty-state';
import type { TabDef } from '@/components/ui/tabs';

type LoadState = 'loading' | 'error' | 'ready';

export default function ParentInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const token = useAuthStore((s) => s.accessToken);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoadState('loading');
    try {
      // Parents n'ont accès qu'à my-invoices (scope enfants appliqué serveur) ;
      // on filtre par id côté client. my-invoices renvoie déjà items + payments.
      const res = await fetch('/api/billing/my-invoices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: Invoice[] };
      setInvoice((data.items ?? []).find((i) => i.id === id) ?? null);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadState === 'loading') {
    return <TableSkeleton rows={4} cols={3} />;
  }
  if (loadState === 'error') {
    return <ErrorRetry message="Impossible de charger la facture." onRetry={() => void load()} />;
  }
  if (!invoice) {
    return (
      <EmptyState
        icon={<FileDown className="h-8 w-8" aria-hidden="true" />}
        title="Facture introuvable"
        description="Cette facture n'existe pas ou ne vous est pas accessible."
        action={{ label: 'Retour aux paiements', href: '/payments' }}
      />
    );
  }

  const items = invoice.items ?? [];
  const payments = invoice.payments ?? [];

  const tabs: TabDef[] = [
    { id: 'infos', label: 'Détail' },
    { id: 'history', label: 'Historique' },
  ];

  const panels: Record<string, React.ReactNode> = {
    infos: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Statut : </span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <div>
            <span className="text-muted-foreground">Échéance : </span>
            {formatDate(invoice.dueDate)}
          </div>
          <div>
            <span className="text-muted-foreground">Total : </span>
            <span className="font-mono font-semibold">
              {formatAmount(invoice.amount, invoice.currency)}
            </span>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune ligne détaillée.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                  <th className="px-4 py-3">Libellé</th>
                  <th className="px-4 py-3 text-right">Qté</th>
                  <th className="px-4 py-3 text-right">P.U.</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{it.label}</td>
                    <td className="px-4 py-3 text-right">{it.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatAmount(it.unitPrice, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatAmount(it.amount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ),
    history:
      payments.length === 0 ? (
        <EmptyState
          icon={<FileDown className="h-8 w-8" aria-hidden="true" />}
          title="Aucun règlement"
          description="Aucun paiement n'a encore été enregistré pour cette facture."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white shadow-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-navy-900">
                  {formatAmount(p.amount, invoice.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.method}
                  {p.reference ? ` · ${p.reference}` : ''}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</span>
            </li>
          ))}
        </ul>
      ),
  };

  return (
    <DetailPage
      backHref="/payments"
      backLabel="Paiements"
      title={invoice.title}
      subtitle={invoice.studentName ?? undefined}
      actions={
        <button
          type="button"
          onClick={() => {
            if (token) void downloadInvoicePdf(token, invoice.id).catch(() => undefined);
          }}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ambre-400"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" /> Télécharger le PDF
        </button>
      }
      tabs={tabs}
      panels={panels}
      defaultTab="infos"
    />
  );
}
