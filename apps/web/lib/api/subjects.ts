import { apiGet, apiPatch } from '@/lib/api/http';

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  emoji: string | null;
  coefficient: number;
  levels: string[];
}

export interface TeacherSubject {
  subjectId: string;
  name: string;
  emoji: string | null;
}

export const listSubjects = (token: string) =>
  apiGet<{ items: Subject[]; total: number }>('/api/subjects', token);

// ── Teacher ↔ subjects (affectations) ────────────────────────────────────────
export const listTeacherSubjects = (token: string, teacherId: string) =>
  apiGet<{ items: TeacherSubject[] }>(`/api/teachers/${teacherId}/subjects`, token);

export const setTeacherSubjects = (token: string, teacherId: string, subjectIds: string[]) =>
  apiPatch<{ items: TeacherSubject[] }>(`/api/teachers/${teacherId}/subjects`, token, {
    subjectIds,
  });
