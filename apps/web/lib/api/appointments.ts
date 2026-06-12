'use client';

/**
 * G6 — Rendez-vous parents API + TanStack Query hooks.
 *
 * Mirrors `lib/api/observations.ts` for the data layer (fetch helper, error
 * class, formatting) and the project hook conventions (`useResource` for reads,
 * `useMutation` + cache invalidation for writes, `useAuthStore` for the token).
 *
 * All requests go through the Next.js passthrough proxy `/api/appointments/*`
 * → NestJS `/api/appointments/*`.
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource, type UseResourceResult } from '@/lib/hooks/use-resource';

const BASE = '/api/appointments';

// ─── Domain types ────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  REQUESTED: 'Demandé',
  CONFIRMED: 'Confirmé',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
  NO_SHOW: 'Absent',
};

export interface AppointmentType {
  id: string;
  name: string;
  durationMin: number;
  active: boolean;
}

export interface AppointmentSlot {
  id: string;
  staffUserId: string;
  startsAt: string;
  endsAt: string;
  isBooked: boolean;
}

export interface AppointmentSlotRef {
  startsAt: string;
  endsAt: string;
  staffUserId: string;
}

export interface Appointment {
  id: string;
  slotId: string;
  typeId: string;
  parentUserId: string;
  studentId: string;
  status: AppointmentStatus;
  note: string | null;
  slot: AppointmentSlotRef;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateTypeInput {
  name: string;
  durationMin: number;
}

export interface CreateSlotInput {
  staffUserId: string;
  startsAt: string;
  endsAt: string;
}

export interface SetAppointmentStatusInput {
  id: string;
  status: AppointmentStatus;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class AppointmentsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppointmentsApiError';
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
    throw new AppointmentsApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Data layer ──────────────────────────────────────────────────────────────

export async function listAppointmentTypes(token: string): Promise<AppointmentType[]> {
  return apiFetch(`${BASE}/types`, token, { method: 'GET' });
}

export async function createAppointmentType(
  token: string,
  data: CreateTypeInput,
): Promise<AppointmentType> {
  return apiFetch(`${BASE}/types`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listAvailableSlots(token: string): Promise<AppointmentSlot[]> {
  return apiFetch(`${BASE}/slots`, token, { method: 'GET' });
}

export async function createAppointmentSlot(
  token: string,
  data: CreateSlotInput,
): Promise<AppointmentSlot> {
  return apiFetch(`${BASE}/slots`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listStaffAppointments(token: string): Promise<Appointment[]> {
  return apiFetch(`${BASE}`, token, { method: 'GET' });
}

export async function setAppointmentStatus(
  token: string,
  id: string,
  status: AppointmentStatus,
): Promise<Appointment> {
  return apiFetch(`${BASE}/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const appointmentTypesKey = (): QueryKey => ['appointments', 'types'];
export const availableSlotsKey = (): QueryKey => ['appointments', 'slots'];
export const staffAppointmentsKey = (): QueryKey => ['appointments', 'list'];

// ─── Read hooks ──────────────────────────────────────────────────────────────

export function useAppointmentTypes(): UseResourceResult<AppointmentType[]> {
  return useResource(appointmentTypesKey(), (token) => listAppointmentTypes(token));
}

export function useAvailableSlots(): UseResourceResult<AppointmentSlot[]> {
  return useResource(availableSlotsKey(), (token) => listAvailableSlots(token));
}

export function useStaffAppointments(): UseResourceResult<Appointment[]> {
  return useResource(staffAppointmentsKey(), (token) => listStaffAppointments(token));
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

export function useCreateType() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTypeInput) => createAppointmentType(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: appointmentTypesKey() });
    },
  });
}

export function useCreateSlot() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSlotInput) => createAppointmentSlot(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: availableSlotsKey() });
    },
  });
}

export function useSetAppointmentStatus() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: SetAppointmentStatusInput) =>
      setAppointmentStatus(requireToken(token), id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

/** Format an ISO date string as DD/MM/YYYY HH:mm. */
export function formatSlot(iso: string): string {
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
