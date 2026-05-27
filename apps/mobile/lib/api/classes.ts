import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectName: string;
}

export interface ClassSummary {
  id: string;
  name: string;
  level: string;
  studentCount: number;
  subject?: string;
}

export interface ClassDetail extends ClassSummary {
  teachers: {
    id: string;
    firstName: string;
    lastName: string;
  }[];
  timeSlots: TimeSlot[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const CLASSES_KEYS = {
  all: ['classes'] as const,
  myClasses: () => ['classes', 'mine'] as const,
  detail: (id: string) => ['classes', id] as const,
} as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns classes assigned to the current user (teacher or admin).
 * Uses `myOnly=true` to scope the list to the requesting user.
 */
export function useMyClasses() {
  return useQuery({
    queryKey: CLASSES_KEYS.myClasses(),
    queryFn: () => fetchApi<ClassSummary[]>('/api/classes?myOnly=true'),
  });
}

/**
 * Returns full detail for a single class including teachers and timetable.
 */
export function useClassDetail(id: string) {
  return useQuery({
    queryKey: CLASSES_KEYS.detail(id),
    queryFn: () => fetchApi<ClassDetail>(`/api/classes/${id}`),
    enabled: !!id,
  });
}
