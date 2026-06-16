import { INVOICE_STATUS_LABELS, type InvoiceStatus } from '@/lib/api/billing';

const TONE: Record<InvoiceStatus, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

/** Pastille de statut de facture — libellé FR + ton, partagé liste/détail. */
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status]}`}
    >
      {INVOICE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
