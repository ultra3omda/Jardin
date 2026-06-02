import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * Lot 6 — Finances (admin). Factures & paiements.
 * Miroir de apps/api/src/billing/billing.controller.ts.
 */
export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface BillingStats {
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  overdueCount: number;
  pendingCount: number;
}

export interface InvoiceItem {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  reference?: string | null;
  paidAt: string;
}

export interface Invoice {
  id: string;
  studentId?: string | null;
  title: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

interface ListInvoicesResponse {
  items: Invoice[];
  total: number;
}

export interface CreateInvoiceInput {
  studentId?: string;
  title: string;
  dueDate: string;
  notes?: string;
  items: { label: string; quantity: number; unitPrice: number }[];
}

export interface RecordPaymentInput {
  amount: number;
  method: string;
  reference?: string;
}

export const BILLING_KEYS = {
  stats: ['billing', 'stats'] as const,
  invoices: ['billing', 'invoices'] as const,
};

export function useBillingStats() {
  return useQuery({
    queryKey: BILLING_KEYS.stats,
    queryFn: () => fetchApi<BillingStats>('/api/billing/stats'),
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: BILLING_KEYS.invoices,
    queryFn: () => fetchApi<ListInvoicesResponse>('/api/billing/invoices'),
  });
}

export function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  return fetchApi<Invoice>('/api/billing/invoices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function recordPayment(invoiceId: string, input: RecordPaymentInput): Promise<Invoice> {
  return fetchApi<Invoice>(`/api/billing/invoices/${invoiceId}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  PENDING: 'En attente',
  PARTIAL: 'Partiel',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
};

export function statusLabel(s: InvoiceStatus): string {
  return STATUS_LABEL[s] ?? s;
}

export function formatAmount(amount: number, currency = 'TND'): string {
  return `${amount.toFixed(3)} ${currency}`;
}
