import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

// ---------------------------------------------------------------------------
// T2b mobile reads — Journal (cahier de liaison), Activités, Cantine.
// Lecture seule ; le backend scope déjà les données au rôle (parent → ses enfants).
// ---------------------------------------------------------------------------

export type ChildMood = 'HAPPY' | 'CALM' | 'TIRED' | 'UPSET' | 'SICK';
export type ActivityCategory = 'ART' | 'MUSIC' | 'SPORT' | 'OUTING' | 'OTHER';

export interface DailyLogEntry {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  meals?: string | null;
  nap?: string | null;
  mood?: ChildMood | null;
  bathroom?: string | null;
  activitiesNote?: string | null;
  generalNote?: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  name: string;
  description?: string | null;
  category: ActivityCategory;
  scheduledAt?: string | null;
  durationMin?: number | null;
  location?: string | null;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanteenMenu {
  id: string;
  date: string;
  starter?: string | null;
  main?: string | null;
  dessert?: string | null;
  vegetarian?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

export const SCHOOL_LIFE_KEYS = {
  journal: ['school-life', 'journal'] as const,
  activities: ['school-life', 'activities'] as const,
  canteen: ['school-life', 'canteen'] as const,
};

export function useJournal() {
  return useQuery({
    queryKey: SCHOOL_LIFE_KEYS.journal,
    queryFn: () => fetchApi<ListResponse<DailyLogEntry>>('/api/journal'),
  });
}

export function useActivities() {
  return useQuery({
    queryKey: SCHOOL_LIFE_KEYS.activities,
    queryFn: () => fetchApi<ListResponse<Activity>>('/api/activities'),
  });
}

export function useCanteenMenus() {
  return useQuery({
    queryKey: SCHOOL_LIFE_KEYS.canteen,
    queryFn: () => fetchApi<ListResponse<CanteenMenu>>('/api/canteen-menus'),
  });
}

// ── Write (admin + teacher) ──────────────────────────────────────────────────

export interface CreateDailyLogInput {
  studentId: string;
  date: string;
  mood?: ChildMood;
  meals?: string;
  nap?: string;
  bathroom?: string;
  activitiesNote?: string;
  generalNote?: string;
}

export interface CreateActivityInput {
  name: string;
  description?: string;
  category?: ActivityCategory;
  scheduledAt?: string;
  durationMin?: number;
  location?: string;
}

export interface CreateCanteenMenuInput {
  date: string;
  starter?: string;
  main?: string;
  dessert?: string;
  vegetarian?: string;
}

/** Drop empty strings/undefined so the API doesn't see explicit nulls. */
function clean<T extends object>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function createDailyLog(input: CreateDailyLogInput): Promise<DailyLogEntry> {
  return fetchApi<DailyLogEntry>('/api/journal', {
    method: 'POST',
    body: JSON.stringify(clean(input)),
  });
}

export function createActivity(input: CreateActivityInput): Promise<Activity> {
  return fetchApi<Activity>('/api/activities', {
    method: 'POST',
    body: JSON.stringify(clean(input)),
  });
}

export function deleteActivity(id: string): Promise<void> {
  return fetchApi<void>(`/api/activities/${id}`, { method: 'DELETE' });
}

export function createCanteenMenu(input: CreateCanteenMenuInput): Promise<CanteenMenu> {
  return fetchApi<CanteenMenu>('/api/canteen-menus', {
    method: 'POST',
    body: JSON.stringify(clean(input)),
  });
}
