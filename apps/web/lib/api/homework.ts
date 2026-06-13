'use client';

/**
 * Devoirs (TAF) — client web + hooks TanStack Query.
 *
 * Le module existait sur mobile mais pas sur web. Mirroir de
 * apps/api/src/homework/homework.controller.ts (routes /api/homework/*),
 * en suivant les conventions web (useResource + useMutation + useAuthStore).
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource, type UseResourceResult } from '@/lib/hooks/use-resource';

const BASE = '/api/homework';

export type SubmissionStatus = 'PENDING' | 'SUBMITTED' | 'LATE';

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  PENDING: 'À rendre',
  SUBMITTED: 'Rendu',
  LATE: 'En retard',
};

export const SUBMISSION_STATUS_BADGE: Record<SubmissionStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  SUBMITTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  LATE: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
};

export interface Homework {
  id: string;
  classId: string;
  className: string;
  subjectId?: string | null;
  subjectName?: string | null;
  title: string;
  instructions: string;
  attachmentUrl?: string | null;
  dueDate: string;
  createdById: string;
  submissionCount: number;
  submittedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HomeworkSubmission {
  id: string;
  studentId: string;
  studentName: string;
  status: SubmissionStatus;
  submittedAt?: string | null;
  feedback?: string | null;
}

export interface HomeworkWithSubmissions {
  homework: Homework;
  submissions: HomeworkSubmission[];
}

export interface CreateHomeworkInput {
  classId: string;
  subjectId?: string;
  title: string;
  instructions: string;
  attachmentUrl?: string;
  dueDate: string;
}

export type UpdateHomeworkInput = Partial<Omit<CreateHomeworkInput, 'classId'>>;

export class HomeworkApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HomeworkApiError';
  }
}

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
    throw new HomeworkApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Data layer ────────────────────────────────────────────────────────────

export async function listHomework(
  token: string,
  classId?: string,
): Promise<{ items: Homework[]; total: number }> {
  const q = classId ? `?classId=${encodeURIComponent(classId)}` : '';
  return apiFetch(`${BASE}${q}`, token, { method: 'GET' });
}

export async function getHomework(token: string, id: string): Promise<HomeworkWithSubmissions> {
  return apiFetch(`${BASE}/${id}`, token, { method: 'GET' });
}

export async function createHomework(
  token: string,
  data: CreateHomeworkInput,
): Promise<Homework> {
  return apiFetch(`${BASE}`, token, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateHomework(
  token: string,
  id: string,
  data: UpdateHomeworkInput,
): Promise<Homework> {
  return apiFetch(`${BASE}/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteHomework(token: string, id: string): Promise<void> {
  return apiFetch(`${BASE}/${id}`, token, { method: 'DELETE' });
}

export async function upsertSubmission(
  token: string,
  homeworkId: string,
  data: { studentId: string; status: SubmissionStatus; feedback?: string },
): Promise<HomeworkWithSubmissions> {
  return apiFetch(`${BASE}/${homeworkId}/submissions`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const homeworkListKey = (classId?: string): QueryKey => [
  'homework',
  'list',
  classId ?? 'all',
];
export const homeworkDetailKey = (id: string): QueryKey => ['homework', 'detail', id];

// ─── Read hooks ──────────────────────────────────────────────────────────────

export function useHomeworkList(classId?: string): UseResourceResult<{
  items: Homework[];
  total: number;
}> {
  return useResource(homeworkListKey(classId), (token) => listHomework(token, classId));
}

export function useHomeworkDetail(id: string): UseResourceResult<HomeworkWithSubmissions> {
  return useResource(homeworkDetailKey(id), (token) => getHomework(token, id));
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

export function useCreateHomework() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHomeworkInput) => createHomework(requireToken(token), data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['homework', 'list'] }),
  });
}

export function useUpdateHomework() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHomeworkInput }) =>
      updateHomework(requireToken(token), id, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['homework'] }),
  });
}

export function useDeleteHomework() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHomework(requireToken(token), id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['homework', 'list'] }),
  });
}

export function useUpsertSubmission(homeworkId: string) {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { studentId: string; status: SubmissionStatus; feedback?: string }) =>
      upsertSubmission(requireToken(token), homeworkId, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: homeworkDetailKey(homeworkId) });
      void qc.invalidateQueries({ queryKey: ['homework', 'list'] });
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDueDate(iso: string): string {
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
