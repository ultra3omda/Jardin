import type { InvoiceStatus } from '@/lib/api/billing';
import { INVOICE_STATUS_LABELS } from '@/lib/api/billing';

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  PARTIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  OVERDUE: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

interface Props {
  status: InvoiceStatus;
}

export function InvoiceStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
