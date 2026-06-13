'use client';

/**
 * G7 — Passage de classe (end-of-year promotion) API + TanStack Query hooks.
 *
 * Mirrors the mutation conventions in `lib/api/appointments.ts` (fetch helper,
 * error class, `useMutation` + `requireToken`). The classes list itself is read
 * through the existing `lib/api/classes.ts` client; this module only adds the
 * two promotion endpoints.
 *
 * All requests go through the existing Next.js passthrough proxy `/api/classes/*`
 * → NestJS `/api/classes/*`.
 */

import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';

const BASE = '/api/classes/promote';

/** Sentinel target value meaning "graduate / leave the school". */
export const GRADUATED = 'GRADUATED' as const;

// ─── Domain types ────────────────────────────────────────────────────────────

export type PromotionTarget = string; // toClassId | 'GRADUATED'

/** Mapping from a source class id to its target (a toYear class id or GRADUATED). */
export type PromotionMapping = Record<string, PromotionTarget>;

export type PromotionAction = 'PROMOTE' | 'GRADUATE' | 'SKIP';

export interface PromotionPlanRow {
  fromClassId: string;
  fromClassName: string;
  studentCount: number;
  action: PromotionAction;
  toClassId: string | null;
}

export interface PromotionPreview {
  plan: PromotionPlanRow[];
  total: number;
}

export interface PromotionCommitResult {
  promoted: number;
  logId: string;
}

export interface PromotionInput {
  fromYear: string;
  toYear: string;
  mapping: PromotionMapping;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class ClassPromotionApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ClassPromotionApiError';
  }
}

// ─── Internal fetch helper ───────────────────────────────────────────────────

async function apiFetch<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Request failed with status ${res.status}`;
    try {
      const parsed = (await res.json()) as { message?: string };
      if (parsed.message) msg = parsed.message;
    } catch {
      /* noop */
    }
    throw new ClassPromotionApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

// ─── Data layer ──────────────────────────────────────────────────────────────

export async function promotePreview(
  token: string,
  input: PromotionInput,
): Promise<PromotionPreview> {
  return apiFetch(`${BASE}/preview`, token, input);
}

export async function promoteCommit(
  token: string,
  input: PromotionInput,
): Promise<PromotionCommitResult> {
  return apiFetch(`${BASE}/commit`, token, input);
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

export function usePromotePreview() {
  const token = useAuthStore((s) => s.accessToken);
  return useMutation<PromotionPreview, Error, PromotionInput>({
    mutationFn: (input) => promotePreview(requireToken(token), input),
  });
}

export function usePromoteCommit() {
  const token = useAuthStore((s) => s.accessToken);
  return useMutation<PromotionCommitResult, Error, PromotionInput>({
    mutationFn: (input) => promoteCommit(requireToken(token), input),
  });
}
