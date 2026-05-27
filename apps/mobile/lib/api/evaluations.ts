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
