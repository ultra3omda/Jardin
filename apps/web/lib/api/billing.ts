'use client';

/**
 * V7-E — Billing API client.
 * All requests go through the Next.js proxy `/api/billing/*` → NestJS.
 */

const BASE = '/api/billing';

// ─── Status ─────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: 'En attente',
  PARTIAL: 'Partiel',
  PAID: 'Payé',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulé',
};

// ─── Shapes ──────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
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
  /** Joined from the student relation — may be present if API includes it. */
  studentName?: string | null;
}

export interface ListInvoicesResponse {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
}

export interface BillingStats {
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  overdueCount: number;
  pendingCount: number;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateInvoiceItemInput {
  label: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  title: string;
  studentId?: string;
  dueDate: string;
  currency?: string;
  notes?: string;
  items: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceInput {
  status?: InvoiceStatus;
  dueDate?: string;
  notes?: string;
}

export interface RecordPaymentInput {
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class BillingApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BillingApiError';
  }
}

// ─── Internal fetch helper ───────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.method && !['GET', 'DELETE'].includes(init.method)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let msg = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) msg = body.message;
    } catch {
      /* noop */
    }
    throw new BillingApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getBillingStats(token: string): Promise<BillingStats> {
  return apiFetch(`${BASE}/stats`, token, { method: 'GET' });
}

export async function listInvoices(
  token: string,
  params: { status?: InvoiceStatus; studentId?: string; page?: number; limit?: number } = {},
): Promise<ListInvoicesResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.studentId) qs.set('studentId', params.studentId);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return apiFetch(`${BASE}/invoices${q ? `?${q}` : ''}`, token, { method: 'GET' });
}

export async function getInvoice(token: string, id: string): Promise<Invoice> {
  return apiFetch(`${BASE}/invoices/${id}`, token, { method: 'GET' });
}

export async function createInvoice(token: string, data: CreateInvoiceInput): Promise<Invoice> {
  return apiFetch(`${BASE}/invoices`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInvoice(
  token: string,
  id: string,
  data: UpdateInvoiceInput,
): Promise<Invoice> {
  return apiFetch(`${BASE}/invoices/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteInvoice(token: string, id: string): Promise<void> {
  return apiFetch(`${BASE}/invoices/${id}`, token, { method: 'DELETE' });
}

export async function recordPayment(
  token: string,
  invoiceId: string,
  data: RecordPaymentInput,
): Promise<Payment> {
  return apiFetch(`${BASE}/invoices/${invoiceId}/payments`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Format a number as a currency string with thousands separator. */
export function formatAmount(amount: number, currency = 'TND'): string {
  if (amount == null || Number.isNaN(amount)) return `— ${currency}`;
  const formatted = amount.toLocaleString('fr-TN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatted} ${currency}`;
}

/** Format an ISO date string as DD/MM/YYYY. */
export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Pad invoice number from sequential index. */
export function invoiceNumber(index: number): string {
  return String(index + 1).padStart(4, '0');
}
