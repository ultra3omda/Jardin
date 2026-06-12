'use client';

/**
 * G4 — Cantine : plats + réservations + stats. API + TanStack Query hooks.
 *
 * Mirrors `lib/api/observations.ts` for the data layer (fetch helper, error
 * class, query keys) and the project hook conventions (`useResource` for reads,
 * `useMutation` + cache invalidation for writes, `useAuthStore` for the token).
 *
 * All requests go through the Next.js passthrough proxy `/api/canteen/*`
 * → NestJS `/api/canteen/*` (dishes, reservations, reservations/stats).
 *
 * NOTE: the legacy school-level menus / meal-plans live in `lib/api/canteen.ts`
 * (`/api/canteen-menus`, `/api/meal-plans`). This file is the new reservation
 * domain and does not overlap.
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource, type UseResourceResult } from '@/lib/hooks/use-resource';

const BASE = '/api/canteen';

// ─── Domain types ────────────────────────────────────────────────────────────

export type ReservationStatus = 'RESERVED' | 'CANCELLED' | 'SERVED';

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  RESERVED: 'Réservé',
  CANCELLED: 'Annulé',
  SERVED: 'Servi',
};

export interface Dish {
  id: string;
  name: string;
  ingredients: string[];
  allergens: string[];
  active: boolean;
}

export interface Reservation {
  id: string;
  studentId: string;
  date: string;
  status: ReservationStatus;
}

export interface ReserveClassResult {
  created: number;
  total: number;
}

export interface CanteenStats {
  perDay: { date: string; count: number }[];
  regimes: { regime: string; count: number }[];
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateDishInput {
  name: string;
  ingredients?: string[];
  allergens?: string[];
}

export interface UpdateDishInput {
  name?: string;
  active?: boolean;
  ingredients?: string[];
  allergens?: string[];
}

export interface ReservationFilters {
  date?: string;
  classId?: string;
  studentId?: string;
}

export interface ReserveInput {
  studentId: string;
  date: string;
}

export interface ReserveClassInput {
  classId: string;
  date: string;
}

export interface CanteenStatsRange {
  from: string;
  to: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class CanteenApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CanteenApiError';
  }
}

// ─── Internal fetch helper ───────────────────────────────────────────────────

async function apiFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
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
    throw new CanteenApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Data layer : dishes ─────────────────────────────────────────────────────

export async function listDishes(token: string): Promise<Dish[]> {
  return apiFetch(`${BASE}/dishes`, token, { method: 'GET' });
}

export async function createDish(token: string, data: CreateDishInput): Promise<Dish> {
  return apiFetch(`${BASE}/dishes`, token, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateDish(token: string, id: string, data: UpdateDishInput): Promise<Dish> {
  return apiFetch(`${BASE}/dishes/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteDish(token: string, id: string): Promise<void> {
  return apiFetch(`${BASE}/dishes/${id}`, token, { method: 'DELETE' });
}

// ─── Data layer : reservations ───────────────────────────────────────────────

export async function listReservations(
  token: string,
  filters: ReservationFilters = {},
): Promise<Reservation[]> {
  const qs = new URLSearchParams();
  if (filters.date) qs.set('date', filters.date);
  if (filters.classId) qs.set('classId', filters.classId);
  if (filters.studentId) qs.set('studentId', filters.studentId);
  const q = qs.toString();
  return apiFetch(`${BASE}/reservations${q ? `?${q}` : ''}`, token, { method: 'GET' });
}

export async function reserve(token: string, data: ReserveInput): Promise<Reservation> {
  return apiFetch(`${BASE}/reservations`, token, { method: 'POST', body: JSON.stringify(data) });
}

export async function reserveClass(
  token: string,
  data: ReserveClassInput,
): Promise<ReserveClassResult> {
  return apiFetch(`${BASE}/reservations/class`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function setReservationStatus(
  token: string,
  id: string,
  status: ReservationStatus,
): Promise<Reservation> {
  return apiFetch(`${BASE}/reservations/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── Data layer : stats ──────────────────────────────────────────────────────

export async function getCanteenStats(token: string, range: CanteenStatsRange): Promise<CanteenStats> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  return apiFetch(`${BASE}/reservations/stats?${qs.toString()}`, token, { method: 'GET' });
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const dishesKey = (): QueryKey => ['canteen', 'dishes'];

export const reservationsKey = (filters: ReservationFilters = {}): QueryKey => [
  'canteen',
  'reservations',
  filters.date ?? null,
  filters.classId ?? null,
  filters.studentId ?? null,
];

export const canteenStatsKey = (range: CanteenStatsRange): QueryKey => [
  'canteen',
  'stats',
  range.from,
  range.to,
];

// ─── Read hooks ──────────────────────────────────────────────────────────────

export function useDishes(): UseResourceResult<Dish[]> {
  return useResource(dishesKey(), (token) => listDishes(token));
}

export function useReservations(
  filters: ReservationFilters = {},
  options?: { enabled?: boolean },
): UseResourceResult<Reservation[]> {
  return useResource(reservationsKey(filters), (token) => listReservations(token, filters), options);
}

export function useCanteenStats(
  from: string,
  to: string,
  options?: { enabled?: boolean },
): UseResourceResult<CanteenStats> {
  return useResource(canteenStatsKey({ from, to }), (token) => getCanteenStats(token, { from, to }), options);
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

export function useCreateDish() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDishInput) => createDish(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dishesKey() });
    },
  });
}

export function useUpdateDish() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDishInput }) =>
      updateDish(requireToken(token), id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dishesKey() });
    },
  });
}

export function useDeleteDish() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDish(requireToken(token), id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dishesKey() });
    },
  });
}

export function useReserve() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReserveInput) => reserve(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['canteen', 'reservations'] });
    },
  });
}

export function useReserveClass() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReserveClassInput) => reserveClass(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['canteen', 'reservations'] });
    },
  });
}

export function useSetReservationStatus() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) =>
      setReservationStatus(requireToken(token), id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['canteen', 'reservations'] });
    },
  });
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

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

/** Today as a `YYYY-MM-DD` string (local time). */
export function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `n` days from today as a `YYYY-MM-DD` string (local time). */
export function dayOffsetInput(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
