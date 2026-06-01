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
  schoolYear?: string;
  studentCount?: number;
  subject?: string;
}

/** API list envelope: GET /api/classes → { items, total }. */
interface ClassListResponse {
  items: ClassSummary[];
  total: number;
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
export function useMyClasses(mine = false) {
  return useQuery({
    queryKey: [...CLASSES_KEYS.myClasses(), mine] as const,
    // API returns an envelope { items, total } — unwrap to the array the UI
    // expects. `mine=true` scopes to the teacher's own assigned classes.
    queryFn: async () => {
      const res = await fetchApi<ClassListResponse>(
        `/api/classes${mine ? '?mine=true' : ''}`,
      );
      return res.items ?? [];
    },
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
