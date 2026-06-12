'use client';

/**
 * G3 — Observations structurées API + TanStack Query hooks.
 *
 * Mirrors `lib/api/fees.ts` / `lib/api/cash-register.ts` for the data layer
 * (fetch helper, error class, formatting) and the project hook conventions
 * (`useResource` for reads, `useMutation` + cache invalidation for writes,
 * `useAuthStore` for the token).
 *
 * All requests go through the Next.js passthrough proxy `/api/observations/*`
 * → NestJS `/api/observations/*`.
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource, type UseResourceResult } from '@/lib/hooks/use-resource';

const BASE = '/api/observations';

// ─── Domain types ────────────────────────────────────────────────────────────

export type ObservationCategory =
  | 'LANGAGE'
  | 'MOTRICITE'
  | 'SOCIAL'
  | 'AUTONOMIE'
  | 'COGNITIF'
  | 'ARTISTIQUE'
  | 'AUTRE';

export type MediaKind = 'PHOTO' | 'VIDEO';

export const OBSERVATION_CATEGORY_LABELS: Record<ObservationCategory, string> = {
  LANGAGE: 'Langage',
  MOTRICITE: 'Motricité',
  SOCIAL: 'Social',
  AUTONOMIE: 'Autonomie',
  COGNITIF: 'Cognitif',
  ARTISTIQUE: 'Artistique',
  AUTRE: 'Autre',
};

export interface ObservationMedia {
  id: string;
  kind: MediaKind;
  url: string;
}

export interface ObservationMediaInput {
  kind: MediaKind;
  url: string;
}

export interface Observation {
  id: string;
  studentId: string;
  authorId: string;
  category: ObservationCategory;
  title: string;
  content: string;
  observedAt: string;
  visibleToParent: boolean;
  batchId?: string | null;
  media: ObservationMedia[];
}

export interface BulkObservationResult {
  batchId: string;
  created: number;
}

export interface MediaUploadUrl {
  uploadUrl: string;
  finalUrl: string;
  kind: MediaKind;
  expiresIn: number;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface ObservationFilters {
  studentId?: string;
  classId?: string;
  category?: ObservationCategory;
}

export interface CreateObservationInput {
  studentId: string;
  category: ObservationCategory;
  title: string;
  content: string;
  observedAt: string;
  visibleToParent?: boolean;
  media?: ObservationMediaInput[];
}

export interface BulkObservationInput {
  studentIds: string[];
  category: ObservationCategory;
  title: string;
  content: string;
  observedAt: string;
  visibleToParent?: boolean;
}

export interface UpdateObservationInput {
  title?: string;
  content?: string;
  category?: ObservationCategory;
  visibleToParent?: boolean;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class ObservationsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ObservationsApiError';
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
    throw new ObservationsApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Data layer ──────────────────────────────────────────────────────────────

export async function listObservations(
  token: string,
  filters: ObservationFilters = {},
): Promise<Observation[]> {
  const qs = new URLSearchParams();
  if (filters.studentId) qs.set('studentId', filters.studentId);
  if (filters.classId) qs.set('classId', filters.classId);
  if (filters.category) qs.set('category', filters.category);
  const q = qs.toString();
  return apiFetch(`${BASE}${q ? `?${q}` : ''}`, token, { method: 'GET' });
}

export async function createObservation(
  token: string,
  data: CreateObservationInput,
): Promise<Observation> {
  return apiFetch(`${BASE}`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function bulkObservation(
  token: string,
  data: BulkObservationInput,
): Promise<BulkObservationResult> {
  return apiFetch(`${BASE}/bulk`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function requestMediaUploadUrl(
  token: string,
  contentType: string,
): Promise<MediaUploadUrl> {
  return apiFetch(`${BASE}/media-upload-url`, token, {
    method: 'POST',
    body: JSON.stringify({ contentType }),
  });
}

export async function updateObservation(
  token: string,
  id: string,
  data: UpdateObservationInput,
): Promise<Observation> {
  return apiFetch(`${BASE}/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteObservation(token: string, id: string): Promise<void> {
  return apiFetch(`${BASE}/${id}`, token, { method: 'DELETE' });
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const observationsKey = (filters: ObservationFilters = {}): QueryKey => [
  'observations',
  'list',
  filters.studentId ?? null,
  filters.classId ?? null,
  filters.category ?? null,
];

// ─── Read hooks ──────────────────────────────────────────────────────────────

export function useObservations(filters: ObservationFilters = {}): UseResourceResult<Observation[]> {
  return useResource(observationsKey(filters), (token) => listObservations(token, filters));
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

export function useCreateObservation() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateObservationInput) => createObservation(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['observations'] });
    },
  });
}

export function useBulkObservation() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkObservationInput) => bulkObservation(requireToken(token), data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['observations'] });
    },
  });
}

export function useUpdateObservation() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateObservationInput }) =>
      updateObservation(requireToken(token), id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['observations'] });
    },
  });
}

export function useDeleteObservation() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteObservation(requireToken(token), id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['observations'] });
    },
  });
}

/**
 * Request a signed upload URL for an observation media file. The caller then
 * PUTs the raw file to `uploadUrl` and submits `{ kind, url: finalUrl }` in the
 * observation's `media[]`.
 */
export function useMediaUploadUrl() {
  const token = useAuthStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (contentType: string) => requestMediaUploadUrl(requireToken(token), contentType),
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
