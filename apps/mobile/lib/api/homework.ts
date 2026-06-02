import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { fetchApi } from './client';

/**
 * Devoirs (TAF). Enseignant : CRUD + suivi des rendus. Parent : devoirs de ses
 * enfants avec statut. Miroir de apps/api/src/homework/*.
 */
export type SubmissionStatus = 'PENDING' | 'SUBMITTED' | 'LATE';

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

export interface ChildHomework {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  subjectName?: string | null;
  title: string;
  instructions: string;
  attachmentUrl?: string | null;
  dueDate: string;
  status: SubmissionStatus;
}

export interface CreateHomeworkInput {
  classId: string;
  subjectId?: string;
  title: string;
  instructions: string;
  attachmentUrl?: string;
  dueDate: string;
}

export const HOMEWORK_KEYS = {
  list: (classId?: string) => ['homework', 'list', classId ?? 'all'] as const,
  detail: (id: string) => ['homework', 'detail', id] as const,
  myChildren: ['homework', 'my-children'] as const,
};

export function useHomeworkList(classId?: string) {
  return useQuery({
    queryKey: HOMEWORK_KEYS.list(classId),
    queryFn: () =>
      fetchApi<{ items: Homework[]; total: number }>(
        `/api/homework${classId ? `?classId=${encodeURIComponent(classId)}` : ''}`,
      ),
  });
}

export function useHomeworkDetail(id: string) {
  return useQuery({
    queryKey: HOMEWORK_KEYS.detail(id),
    queryFn: () => fetchApi<HomeworkWithSubmissions>(`/api/homework/${id}`),
    enabled: !!id,
  });
}

export function useChildrenHomework() {
  return useQuery({
    queryKey: HOMEWORK_KEYS.myChildren,
    queryFn: () => fetchApi<{ items: ChildHomework[]; total: number }>('/api/homework/my-children'),
  });
}

export function createHomework(input: CreateHomeworkInput): Promise<Homework> {
  return fetchApi<Homework>('/api/homework', { method: 'POST', body: JSON.stringify(input) });
}

export function deleteHomework(id: string): Promise<void> {
  return fetchApi<void>(`/api/homework/${id}`, { method: 'DELETE' });
}

export function upsertSubmission(
  homeworkId: string,
  studentId: string,
  status: SubmissionStatus,
  feedback?: string,
): Promise<HomeworkWithSubmissions> {
  return fetchApi<HomeworkWithSubmissions>(`/api/homework/${homeworkId}/submissions`, {
    method: 'PUT',
    body: JSON.stringify({ studentId, status, feedback }),
  });
}

interface AttachmentUploadResponse {
  uploadUrl: string;
  finalUrl: string;
  expiresIn: number;
}

/**
 * Web only: ouvre un sélecteur de fichier, demande une URL signée R2, envoie le
 * fichier puis renvoie l'URL publique finale. Sur natif (Vague 12) → null.
 */
export async function pickAndUploadAttachment(): Promise<string | null> {
  if (Platform.OS !== 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = (globalThis as any).document;
  if (!doc) return null;

  return new Promise((resolve, reject) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,application/pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const signed = await fetchApi<AttachmentUploadResponse>('/api/homework/attachment-upload-url', {
          method: 'POST',
          body: JSON.stringify({ contentType: file.type }),
        });
        const put = await fetch(signed.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!put.ok) throw new Error(`Upload échoué (${put.status})`);
        resolve(signed.finalUrl);
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Upload échoué'));
      }
    };
    input.click();
  });
}

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  PENDING: 'À rendre',
  SUBMITTED: 'Rendu',
  LATE: 'En retard',
};
export function submissionLabel(s: SubmissionStatus): string {
  return STATUS_LABEL[s] ?? s;
}

export function useUpsertSubmission(homeworkId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { studentId: string; status: SubmissionStatus; feedback?: string }) =>
      upsertSubmission(homeworkId, v.studentId, v.status, v.feedback),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOMEWORK_KEYS.detail(homeworkId) });
      void qc.invalidateQueries({ queryKey: ['homework', 'list'] });
    },
  });
}
