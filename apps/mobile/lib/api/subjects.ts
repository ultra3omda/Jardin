import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * Matières (subjects). Lecture pour tous (admin/teacher/staff) ; écriture admin.
 * Miroir de apps/api/src/subjects/subjects.controller.ts.
 */
export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  emoji?: string | null;
  coefficient: number;
  levels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectInput {
  name: string;
  code?: string;
  emoji?: string;
  coefficient?: number;
  levels?: string[];
}

interface ListSubjectsResponse {
  items: Subject[];
  total: number;
}

export const SUBJECTS_KEY = ['subjects'] as const;

export function useSubjects() {
  return useQuery({
    queryKey: SUBJECTS_KEY,
    queryFn: () => fetchApi<ListSubjectsResponse>('/api/subjects'),
  });
}

export type UpdateSubjectInput = Partial<CreateSubjectInput>;

export function createSubject(input: CreateSubjectInput): Promise<Subject> {
  return fetchApi<Subject>('/api/subjects', { method: 'POST', body: JSON.stringify(input) });
}

export function updateSubject(id: string, input: UpdateSubjectInput): Promise<Subject> {
  return fetchApi<Subject>(`/api/subjects/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSubject(id: string): Promise<void> {
  return fetchApi<void>(`/api/subjects/${id}`, { method: 'DELETE' });
}
