'use client';

/**
 * G1 — Caisse, dépenses, fournisseurs API + TanStack Query hooks.
 *
 * Mirrors `lib/api/fees.ts` for the data layer (fetch helper, error class,
 * formatting) and the project hook conventions (`useResource` for reads,
 * `useMutation` + cache invalidation for writes, `useAuthStore` for the token).
 *
 * Requests go through the Next.js passthrough proxies:
 *   `/api/cash-register/*` → NestJS `/api/cash-register/*`
 *   `/api/suppliers/*`     → NestJS `/api/suppliers/*`
 *   `/api/expenses/*`      → NestJS `/api/expenses/*`
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource, type UseResourceResult } from '@/lib/hooks/use-resource';

const CASH_BASE = '/api/cash-register';
const SUPPLIERS_BASE = '/api/suppliers';
const EXPENSES_BASE = '/api/expenses';

// ─── Domain types ────────────────────────────────────────────────────────────

export type MovementKind = 'INCOME' | 'EXPENSE';
export type SessionStatus = 'OPEN' | 'CLOSED';
export type ExpenseMethod = 'cash' | 'cheque' | 'bank_transfer';

export const MOVEMENT_KIND_LABELS: Record<MovementKind, string> = {
  INCOME: 'Entrée',
  EXPENSE: 'Sortie',
};

export const EXPENSE_METHOD_LABELS: Record<ExpenseMethod, string> = {
  cash: 'Espèces',
  cheque: 'Chèque',
  bank_transfer: 'Virement',
};

export interface CashMovement {
  id: string;
  kind: MovementKind;
  amount: number;
  label: string;
  createdAt: string;
}

export interface CashSession {
  id: string;
  openingFloat: number;
  status: SessionStatus;
  movements: CashMovement[];
  liveExpected: number;
  openedAt?: string;
  notes?: string | null;
}

export interface CashClosure {
  id: string;
  openingFloat: number;
  expectedAmount: number;
  countedAmount: number;
  variance: number;
  status: SessionStatus;
  openedAt: string;
  closedAt: string;
}

export interface CloseSessionResult {
  expectedAmount: number;
  countedAmount: number;
  variance: number;
  status: 'CLOSED';
  closedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  paidAt: string;
  method: ExpenseMethod;
  supplierId?: string | null;
  reference?: string | null;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface OpenSessionInput {
  openingFloat: number;
  notes?: string;
}

export interface AddMovementInput {
  kind: MovementKind;
  amount: number;
  label: string;
}

export interface CloseSessionInput {
  countedAmount: number;
  notes?: string;
}

export interface CreateSupplierInput {
  name: string;
  phone?: string;
  email?: string;
  taxId?: string;
}

export interface CreateExpenseInput {
  category: string;
  amount: number;
  paidAt: string;
  method: ExpenseMethod;
  supplierId?: string;
  reference?: string;
}

export interface ExpenseFilters {
  category?: string;
  supplierId?: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class CashRegisterApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CashRegisterApiError';
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
    throw new CashRegisterApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Data layer ──────────────────────────────────────────────────────────────

export async function getCurrentSession(token: string): Promise<CashSession | null> {
  return apiFetch(`${CASH_BASE}/current`, token, { method: 'GET' });
}

export async function openSession(token: string, data: OpenSessionInput): Promise<CashSession> {
  return apiFetch(`${CASH_BASE}/open`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addMovement(
  token: string,
  sessionId: string,
  data: AddMovementInput,
): Promise<CashMovement> {
  return apiFetch(`${CASH_BASE}/${sessionId}/movements`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function closeSession(
  token: string,
  sessionId: string,
  data: CloseSessionInput,
): Promise<CloseSessionResult> {
  return apiFetch(`${CASH_BASE}/${sessionId}/close`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listClosures(token: string): Promise<CashClosure[]> {
  return apiFetch(`${CASH_BASE}/closures`, token, { method: 'GET' });
}

export async function listSuppliers(token: string): Promise<Supplier[]> {
  return apiFetch(`${SUPPLIERS_BASE}`, token, { method: 'GET' });
}

export async function createSupplier(token: string, data: CreateSupplierInput): Promise<Supplier> {
  return apiFetch(`${SUPPLIERS_BASE}`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteSupplier(token: string, id: string): Promise<void> {
  return apiFetch(`${SUPPLIERS_BASE}/${id}`, token, { method: 'DELETE' });
}

export async function listExpenses(token: string, filters: ExpenseFilters = {}): Promise<Expense[]> {
  const qs = new URLSearchParams();
  if (filters.category) qs.set('category', filters.category);
  if (filters.supplierId) qs.set('supplierId', filters.supplierId);
  const q = qs.toString();
  return apiFetch(`${EXPENSES_BASE}${q ? `?${q}` : ''}`, token, { method: 'GET' });
}

export async function createExpense(token: string, data: CreateExpenseInput): Promise<Expense> {
  return apiFetch(`${EXPENSES_BASE}`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const CURRENT_SESSION_KEY: QueryKey = ['cash-register', 'current'];
export const CLOSURES_KEY: QueryKey = ['cash-register', 'closures'];
export const SUPPLIERS_KEY: QueryKey = ['cash-register', 'suppliers'];
export const expensesKey = (filters: ExpenseFilters = {}): QueryKey => [
  'cash-register',
  'expenses',
  filters.category ?? null,
  filters.supplierId ?? null,
];

// ─── Read hooks ──────────────────────────────────────────────────────────────

export function useCurrentSession(): UseResourceResult<CashSession | null> {
  return useResource(CURRENT_SESSION_KEY, (token) => getCurrentSession(token));
}

export function useClosures(): UseResourceResult<CashClosure[]> {
  return useResource(CLOSURES_KEY, (token) => listClosures(token));
}

export function useSuppliers(): UseResourceResult<Supplier[]> {
  return useResource(SUPPLIERS_KEY, (token) => listSuppliers(token));
}

export function useExpenses(filters: ExpenseFilters = {}): UseResourceResult<Expense[]> {
  return useResource(expensesKey(filters), (token) => listExpenses(token, filters));
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

export function useOpenSession() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OpenSessionInput) => openSession(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CURRENT_SESSION_KEY });
    },
  });
}

export function useAddMovement() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: AddMovementInput }) =>
      addMovement(requireToken(token), sessionId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CURRENT_SESSION_KEY });
    },
  });
}

export function useCloseSession() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: CloseSessionInput }) =>
      closeSession(requireToken(token), sessionId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CURRENT_SESSION_KEY });
      void qc.invalidateQueries({ queryKey: CLOSURES_KEY });
    },
  });
}

export function useCreateSupplier() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplierInput) => createSupplier(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    },
  });
}

export function useDeleteSupplier() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(requireToken(token), id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    },
  });
}

export function useCreateExpense() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) => createExpense(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cash-register', 'expenses'] });
    },
  });
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

/** Format a TND amount as e.g. "100.000 TND" (TND, 3 decimals). */
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

/** Format an ISO date string as DD/MM/YYYY HH:mm. */
export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
