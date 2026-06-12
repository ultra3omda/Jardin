'use client';

/**
 * G5 — Rapports d'activité PDF : API client + TanStack Query hooks.
 *
 * Mirrors `lib/api/activities.ts` (http helpers) for reads/writes and
 * `lib/api/billing.ts#downloadInvoicePdf` for the auth-gated binary PDF
 * (fetch as blob → open in a new tab). The signed photo-upload flow mirrors
 * `lib/api/observations.ts` (request upload URL → PUT raw file → store finalUrl).
 *
 * All requests go through the existing Next.js proxy `/api/activities/*`
 * → NestJS `/api/activities/*`.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api/http';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource, type UseResourceResult } from '@/lib/hooks/use-resource';

const BASE = '/api/activities';

// ─── Domain types ────────────────────────────────────────────────────────────

export interface ActivityReport {
  id: string;
  activityId: string;
  title: string;
  summary: string;
  photoUrls: string[];
  visibleToParent: boolean;
  generatedAt: string;
}

export interface UpsertActivityReportInput {
  title: string;
  summary: string;
  photoUrls?: string[];
  visibleToParent?: boolean;
}

export interface ReportPhotoUploadUrl {
  uploadUrl: string;
  finalUrl: string;
  expiresIn: number;
}

// ─── Data layer ──────────────────────────────────────────────────────────────

/** GET the report for an activity — resolves to `null` when none exists yet. */
export const getActivityReport = (token: string, activityId: string) =>
  apiGet<ActivityReport | null>(`${BASE}/${activityId}/report`, token);

/** Create/update the activity's report (idempotent — 1 report per activity). */
export const upsertActivityReport = (
  token: string,
  activityId: string,
  input: UpsertActivityReportInput,
) => apiPost<ActivityReport>(`${BASE}/${activityId}/report`, token, input);

/**
 * Request a signed upload URL for a report photo. The caller then PUTs the raw
 * file to `uploadUrl` and submits `finalUrl` inside `photoUrls`.
 */
export const requestReportPhotoUploadUrl = (
  token: string,
  activityId: string,
  contentType: string,
) =>
  apiPost<ReportPhotoUploadUrl>(`${BASE}/${activityId}/report/photo-upload-url`, token, {
    contentType,
  });

// ─── Query keys ──────────────────────────────────────────────────────────────

export const activityReportKey = (activityId: string) =>
  ['activity-report', activityId] as const;

// ─── Read hooks ──────────────────────────────────────────────────────────────

export function useActivityReport(activityId: string): UseResourceResult<ActivityReport | null> {
  return useResource(activityReportKey(activityId), (token) =>
    getActivityReport(token, activityId),
  );
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

export function useUpsertActivityReport(activityId: string) {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertActivityReportInput) =>
      upsertActivityReport(requireToken(token), activityId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: activityReportKey(activityId) });
    },
  });
}

export function useReportPhotoUploadUrl(activityId: string) {
  const token = useAuthStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (contentType: string) =>
      requestReportPhotoUploadUrl(requireToken(token), activityId, contentType),
  });
}

// ─── Photo upload helper ─────────────────────────────────────────────────────

/**
 * Upload one photo for an activity report: request a signed URL, PUT the raw
 * file to it, and return the public `finalUrl` to store in `photoUrls`.
 */
export async function uploadReportPhoto(
  token: string,
  activityId: string,
  file: File,
): Promise<string> {
  const { uploadUrl, finalUrl } = await requestReportPhotoUploadUrl(
    token,
    activityId,
    file.type || 'application/octet-stream',
  );
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Échec de l'envoi de la photo (${put.status})`);
  }
  return finalUrl;
}

// ─── PDF download ────────────────────────────────────────────────────────────

/**
 * Fetch the activity report PDF (auth-gated, binary) and open it in a new tab.
 * Mirrors `billing.ts#downloadInvoicePdf`: the proxy passes the binary stream
 * through, we read it as a blob and open it. Throws on a non-OK response.
 */
export async function downloadActivityReportPdf(
  token: string,
  activityId: string,
): Promise<void> {
  const res = await fetch(`${BASE}/${activityId}/report/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Échec du téléchargement du PDF (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Revoke after a tick so the new tab has time to read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
