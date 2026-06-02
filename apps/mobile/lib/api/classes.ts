import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeSlot {
  id: string;
  dayOfWeek: number;
  periodStart: string;
  periodEnd: string;
  subject: string;
  room?: string | null;
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

/** A slot from the current teacher's aggregated timetable (all their classes). */
export interface MyScheduleSlot extends TimeSlot {
  classId: string;
  className: string;
}

interface MyScheduleResponse {
  items: MyScheduleSlot[];
  total: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const CLASSES_KEYS = {
  all: ['classes'] as const,
  myClasses: () => ['classes', 'mine'] as const,
  detail: (id: string) => ['classes', id] as const,
  mySchedule: () => ['classes', 'my-schedule'] as const,
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
 * Returns the current teacher/staff aggregated timetable across all their
 * classes (GET /api/classes/my-schedule).
 */
export function useMySchedule() {
  return useQuery({
    queryKey: CLASSES_KEYS.mySchedule(),
    queryFn: async () => {
      const res = await fetchApi<MyScheduleResponse>('/api/classes/my-schedule');
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

// ── Management (SCHOOL_ADMIN) ────────────────────────────────────────────────

export interface CreateClassInput {
  name: string;
  level: string;
  schoolYear: string;
}

export function createClass(input: CreateClassInput): Promise<ClassSummary> {
  return fetchApi<ClassSummary>('/api/classes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteClass(id: string): Promise<void> {
  return fetchApi<void>(`/api/classes/${id}`, { method: 'DELETE' });
}

export function assignClassTeacher(
  classId: string,
  teacherUserId: string,
  subject: string,
  isMainTeacher = false,
): Promise<unknown> {
  return fetchApi<unknown>(`/api/classes/${classId}/teachers`, {
    method: 'POST',
    body: JSON.stringify({ teacherUserId, subject, isMainTeacher }),
  });
}
