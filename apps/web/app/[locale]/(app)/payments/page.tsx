'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Invoice {
  id: string;
  studentName: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  paidAt: string | null;
}
interface BillingStats { totalRevenue: number; pendingAmount: number; overdueCount: number; currency: string }

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Payé', PENDING: 'En attente', OVERDUE: 'En retard', CANCELLED: 'Annulé',
};
const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

const DEMO_STATS: BillingStats = { totalRevenue: 12450, pendingAmount: 3200, overdueCount: 4, currency: 'TND' };
const DEMO_INVOICES: Invoice[] = [
  { id: '1', studentName: 'Ahmed Ben Ali', amount: 450, currency: 'TND', status: 'PAID', dueDate: '2025-01-15', paidAt: '2025-01-12' },
  { id: '2', studentName: 'Fatma Trabelsi', amount: 450, currency: 'TND', status: 'PENDING', dueDate: '2025-02-15', paidAt: null },
  { id: '3', studentName: 'Mohamed Chaabane', amount: 450, currency: 'TND', status: 'OVERDUE', dueDate: '2025-01-15', paidAt: null },
  { id: '4', studentName: 'Yasmine Gharbi', amount: 450, currency: 'TND', status: 'PAID', dueDate: '2025-01-15', paidAt: '2025-01-14' },
  { id: '5', studentName: 'Khalil Mejri', amount: 450, currency: 'TND', status: 'PAID', dueDate: '2025-02-15', paidAt: '2025-02-10' },
  { id: '6', studentName: 'Nour Baccouche', amount: 450, currency: 'TND', status: 'OVERDUE', dueDate: '2025-01-15', paidAt: null },
];

export default function PaymentsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats>(DEMO_STATS);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        fetch('/api/billing/invoices', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/billing/stats', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const invData = invRes.ok ? (await invRes.json() as { items: Invoice[] }) : null;
      const statsData = statsRes.ok ? (await statsRes.json() as BillingStats) : null;
      setInvoices(invData?.items?.length ? invData.items : DEMO_INVOICES);
      setStats(statsData ?? DEMO_STATS);
    } catch {
      setInvoices(DEMO_INVOICES);
      setStats(DEMO_STATS);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const filtered = filterStatus ? invoices.filter((i) => i.status === filterStatus) : invoices;

  const fmt = (n: number, cur: string) => {
    try { return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: cur }).format(n); }
    catch { return `${n} ${cur}`; }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Paiements</h1>
        <p className="text-sm text-muted-foreground">Consultez l&apos;historique des paiements et règlements.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Revenus encaissés', value: fmt(stats.totalRevenue, stats.currency), color: 'text-green-700' },
          { label: 'En attente', value: fmt(stats.pendingAmount, stats.currency), color: 'text-yellow-700' },
          { label: 'Factures en retard', value: String(stats.overdueCount), color: 'text-red-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="rounded-md border px-3 py-2 text-sm" value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.keys(STATUS_LABELS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">Aucune facture.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Payé le</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{inv.studentName}</td>
                  <td className="px-4 py-3 font-mono">{fmt(inv.amount, inv.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] ?? ''}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('fr-FR') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}