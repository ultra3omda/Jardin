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
