import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubjectGrade {
  subjectName: string;
  subjectEmoji?: string;
  grade: number | null;
  outOf: number;
  coefficient: number;
}

export interface ChildGrades {
  childName: string;
  className: string;
  subjects: SubjectGrade[];
  average: number | null;
}

export interface ClassEvalStats {
  className: string;
  subjectName: string;
  average: number | null;
  studentCount: number;
  doneCount: number;
}

export interface AdminClassPerf {
  className: string;
  overall: number | null;
  topSubject: string;
  studentCount: number;
}

// Lot 3 — gestion des évaluations (admin + enseignant)

export interface Evaluation {
  id: string;
  classId: string;
  subjectId: string;
  gradePeriodId: string;
  title: string;
  date: string;
  maxScore: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  evaluationId: string;
  studentId: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationWithGrades {
  evaluation: Evaluation;
  grades: Grade[];
}

export interface CreateEvaluationInput {
  classId: string;
  subjectId: string;
  gradePeriodId: string;
  title: string;
  date: string;
  maxScore: number;
}

interface ListEvaluationsResponse {
  items: Evaluation[];
  total: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const EVALUATIONS_KEYS = {
  all: ['evaluations'] as const,
  myGrades: () => ['evaluations', 'my-grades'] as const,
  myClasses: () => ['evaluations', 'my-classes'] as const,
  adminPerf: () => ['evaluations', 'admin-perf'] as const,
} as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * For PARENT role — returns grades for all children linked to this parent.
 */
export function useMyGrades() {
  return useQuery({
    queryKey: EVALUATIONS_KEYS.myGrades(),
    queryFn: () => fetchApi<ChildGrades[]>('/api/evaluations/my-grades'),
  });
}

/**
 * For TEACHER role — returns evaluation stats per class/subject.
 */
export function useMyClasses() {
  return useQuery({
    queryKey: EVALUATIONS_KEYS.myClasses(),
    queryFn: () => fetchApi<ClassEvalStats[]>('/api/evaluations/my-classes'),
  });
}

/**
 * For SCHOOL_ADMIN role — returns performance summary per class.
 */
export function useAdminClassPerf() {
  return useQuery({
    queryKey: EVALUATIONS_KEYS.adminPerf(),
    queryFn: () => fetchApi<AdminClassPerf[]>('/api/evaluations/admin-perf'),
  });
}

// ── Management (admin + teacher) ─────────────────────────────────────────────

/** List evaluations, optionally filtered by class. */
export function useEvaluations(classId?: string) {
  const qs = classId ? `?classId=${encodeURIComponent(classId)}` : '';
  return useQuery({
    queryKey: ['evaluations', 'list', classId ?? 'all'] as const,
    queryFn: () => fetchApi<ListEvaluationsResponse>(`/api/evaluations${qs}`),
  });
}

/** A single evaluation with its grades (for grade entry). */
export function useEvaluationDetail(id: string) {
  return useQuery({
    queryKey: ['evaluations', 'detail', id] as const,
    queryFn: () => fetchApi<EvaluationWithGrades>(`/api/evaluations/${id}`),
    enabled: !!id,
  });
}

export function createEvaluation(input: CreateEvaluationInput): Promise<Evaluation> {
  return fetchApi<Evaluation>('/api/evaluations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function upsertGrade(
  evaluationId: string,
  studentId: string,
  score: number,
): Promise<Grade> {
  return fetchApi<Grade>(`/api/evaluations/${evaluationId}/grades`, {
    method: 'PUT',
    body: JSON.stringify({ studentId, score }),
  });
}

export function deleteEvaluation(id: string): Promise<void> {
  return fetchApi<void>(`/api/evaluations/${id}`, { method: 'DELETE' });
}
