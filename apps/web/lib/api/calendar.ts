'use client';

/**
 * G8 — Calendrier scolaire API + TanStack Query hooks.
 *
 * Mirrors `lib/api/observations.ts` for the data layer (fetch helper, error
 * class, formatting) and the project hook conventions (`useResource` for reads,
 * `useMutation` + cache invalidation for writes, `useAuthStore` for the token).
 *
 * Calendar events go through the Next.js passthrough proxy `/api/calendar/*`
 * → NestJS `/api/calendar/*`. The circular PDF attachment is mounted under the
 * same `/api/calendar/attachment-upload-url` route (signed URL → PUT → finalUrl)
 * and is reused by the announcements "CIRCULAIRE" flow.
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource, type UseResourceResult } from '@/lib/hooks/use-resource';

const BASE = '/api/calendar';

// ─── Domain types ────────────────────────────────────────────────────────────

export type CalendarEventType = 'VACATION' | 'HOLIDAY' | 'EVENT' | 'EXAM' | 'MEETING';

export const CALENDAR_EVENT_TYPES: readonly CalendarEventType[] = [
  'VACATION',
  'HOLIDAY',
  'EVENT',
  'EXAM',
  'MEETING',
] as const;

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  VACATION: 'Vacances',
  HOLIDAY: 'Jour férié',
  EVENT: 'Événement',
  EXAM: 'Examen',
  MEETING: 'Réunion',
};

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  schoolYear: string;
  notes: string | null;
}

export interface AttachmentUploadUrl {
  uploadUrl: string;
  finalUrl: string;
  expiresIn: number;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateEventInput {
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  schoolYear: string;
  notes?: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class CalendarApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CalendarApiError';
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
    throw new CalendarApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Data layer ──────────────────────────────────────────────────────────────

export async function listCalendarEvents(
  token: string,
  schoolYear?: string,
): Promise<CalendarEvent[]> {
  const qs = new URLSearchParams();
  if (schoolYear) qs.set('schoolYear', schoolYear);
  const q = qs.toString();
  return apiFetch(`${BASE}${q ? `?${q}` : ''}`, token, { method: 'GET' });
}

export async function createCalendarEvent(
  token: string,
  data: CreateEventInput,
): Promise<CalendarEvent> {
  return apiFetch(`${BASE}`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteCalendarEvent(token: string, id: string): Promise<void> {
  return apiFetch(`${BASE}/${id}`, token, { method: 'DELETE' });
}

export async function requestAttachmentUploadUrl(
  token: string,
  contentType: string,
): Promise<AttachmentUploadUrl> {
  return apiFetch(`${BASE}/attachment-upload-url`, token, {
    method: 'POST',
    body: JSON.stringify({ contentType }),
  });
}

/**
 * Request a signed upload URL for a PDF attachment, PUT the raw file to it, and
 * return the public `finalUrl`. Shared by the calendar and the announcements
 * "CIRCULAIRE" flow.
 */
export async function uploadCircularPdf(token: string, file: File): Promise<string> {
  const signed = await requestAttachmentUploadUrl(token, 'application/pdf');
  const putRes = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Échec du téléversement (${putRes.status})`);
  }
  return signed.finalUrl;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const calendarKey = (schoolYear?: string): QueryKey => [
  'calendar',
  'list',
  schoolYear ?? null,
];

// ─── Read hooks ──────────────────────────────────────────────────────────────

export function useCalendar(schoolYear?: string): UseResourceResult<CalendarEvent[]> {
  return useResource(calendarKey(schoolYear), (token) => listCalendarEvents(token, schoolYear));
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

export function useCreateEvent() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEventInput) => createCalendarEvent(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useDeleteEvent() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(requireToken(token), id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

/**
 * Upload a circular PDF: requests a signed URL, PUTs the file, and resolves to
 * the public `finalUrl` to store as `attachmentUrl`.
 */
export function useCircularAttachmentUploadUrl() {
  const token = useAuthStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (file: File) => uploadCircularPdf(requireToken(token), file),
  });
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

/** Format an ISO date string as DD/MM/YYYY. */
export function formatEventDate(iso: string): string {
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

/** Render a single-day or a date range, collapsing identical start/end dates. */
export function formatEventRange(startDate: string, endDate: string): string {
  const start = formatEventDate(startDate);
  const end = formatEventDate(endDate);
  return start === end ? start : `${start} → ${end}`;
}
