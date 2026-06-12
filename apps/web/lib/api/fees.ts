'use client';

/**
 * G2 — Référentiel de frais (fee reference) API + TanStack Query hooks.
 *
 * Mirrors `lib/api/billing.ts` for the data layer (fetch helper, error class,
 * formatting) and the project hook conventions (`useResource` for reads,
 * `useMutation` + cache invalidation for writes, `useAuthStore` for the token).
 *
 * All requests go through the Next.js passthrough proxy `/api/billing/*` →
 * NestJS `/api/billing/*` (catch-all route handler already in place).
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource, type UseResourceResult } from '@/lib/hooks/use-resource';

const BASE = '/api/billing';

// ─── Domain types ────────────────────────────────────────────────────────────

export type FeeCategory = 'STANDARD' | 'DIVERS' | 'OPTIONNEL';
export type FeeRecurrence = 'ONCE' | 'MONTHLY' | 'TERM' | 'YEARLY';

export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  STANDARD: 'Standard',
  DIVERS: 'Divers',
  OPTIONNEL: 'Optionnel',
};

export const FEE_RECURRENCE_LABELS: Record<FeeRecurrence, string> = {
  ONCE: 'Unique',
  MONTHLY: 'Mensuel',
  TERM: 'Trimestriel',
  YEARLY: 'Annuel',
};

export interface FeeType {
  id: string;
  name: string;
  category: FeeCategory;
  defaultAmount: number;
  recurrence: FeeRecurrence;
  level?: string | null;
  schoolYear: string;
  active: boolean;
}

export interface UnpaidRow {
  installmentId: string;
  studentId: string;
  studentName: string;
  feeName: string;
  label: string;
  dueDate: string;
  amount: number;
  overdue: boolean;
}

export interface BulkAssignResult {
  created: number;
  skipped: number;
  total: number;
}

export interface RemindResult {
  sent: number;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateFeeTypeInput {
  name: string;
  category: FeeCategory;
  defaultAmount: number;
  recurrence: FeeRecurrence;
  level?: string;
  schoolYear: string;
}

export interface UpdateFeeTypeInput {
  name?: string;
  defaultAmount?: number;
  active?: boolean;
}

export interface BulkAssignInput {
  feeTypeId: string;
  classId?: string;
  level?: string;
  schoolYear: string;
  amount?: number;
  advanceAmount?: number;
  installments: number;
}

export interface UnpaidParams {
  classId?: string;
  studentId?: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class FeesApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'FeesApiError';
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
    throw new FeesApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Data layer ──────────────────────────────────────────────────────────────

export async function listFeeTypes(token: string): Promise<FeeType[]> {
  return apiFetch(`${BASE}/fee-types`, token, { method: 'GET' });
}

export async function createFeeType(token: string, data: CreateFeeTypeInput): Promise<FeeType> {
  return apiFetch(`${BASE}/fee-types`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFeeType(
  token: string,
  id: string,
  data: UpdateFeeTypeInput,
): Promise<FeeType> {
  return apiFetch(`${BASE}/fee-types/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteFeeType(token: string, id: string): Promise<void> {
  return apiFetch(`${BASE}/fee-types/${id}`, token, { method: 'DELETE' });
}

export async function bulkAssignFees(
  token: string,
  data: BulkAssignInput,
): Promise<BulkAssignResult> {
  return apiFetch(`${BASE}/fee-assignments/bulk`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listUnpaid(token: string, params: UnpaidParams = {}): Promise<UnpaidRow[]> {
  const qs = new URLSearchParams();
  if (params.classId) qs.set('classId', params.classId);
  if (params.studentId) qs.set('studentId', params.studentId);
  const q = qs.toString();
  return apiFetch(`${BASE}/unpaid${q ? `?${q}` : ''}`, token, { method: 'GET' });
}

export async function remindUnpaid(token: string, installmentIds: string[]): Promise<RemindResult> {
  return apiFetch(`${BASE}/unpaid/remind`, token, {
    method: 'POST',
    body: JSON.stringify({ installmentIds }),
  });
}

export async function generateInstallmentInvoice(
  token: string,
  installmentId: string,
): Promise<{ invoiceId: string }> {
  return apiFetch(`${BASE}/installments/${installmentId}/invoice`, token, { method: 'POST' });
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const FEE_TYPES_KEY: QueryKey = ['fees', 'fee-types'];
export const unpaidKey = (params: UnpaidParams = {}): QueryKey => [
  'fees',
  'unpaid',
  params.classId ?? null,
  params.studentId ?? null,
];

// ─── Read hooks ──────────────────────────────────────────────────────────────

export function useFeeTypes(): UseResourceResult<FeeType[]> {
  return useResource(FEE_TYPES_KEY, (token) => listFeeTypes(token));
}

export function useUnpaid(params: UnpaidParams = {}): UseResourceResult<UnpaidRow[]> {
  return useResource(unpaidKey(params), (token) => listUnpaid(token, params));
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

export function useCreateFeeType() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeeTypeInput) => createFeeType(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: FEE_TYPES_KEY });
    },
  });
}

export function useUpdateFeeType() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFeeTypeInput }) =>
      updateFeeType(requireToken(token), id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: FEE_TYPES_KEY });
    },
  });
}

export function useDeleteFeeType() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFeeType(requireToken(token), id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: FEE_TYPES_KEY });
    },
  });
}

export function useBulkAssignFees() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkAssignInput) => bulkAssignFees(requireToken(token), data),
    onSuccess: () => {
      // New installments may create unpaid rows; refresh those views.
      void qc.invalidateQueries({ queryKey: ['fees', 'unpaid'] });
    },
  });
}

export function useRemindUnpaid() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (installmentIds: string[]) => remindUnpaid(requireToken(token), installmentIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fees', 'unpaid'] });
    },
  });
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

/** Format a millime amount as e.g. "900.000 TND" (TND, 3 decimals). */
export function formatTnd(amount: number): string {
  if (amount == null || Number.isNaN(amount)) return '— TND';
  const formatted = amount.toLocaleString('fr-TN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return `${formatted} TND`;
}

/** Format an ISO date string as DD/MM/YYYY. */
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
