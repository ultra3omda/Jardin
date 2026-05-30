import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type ChildMood = 'HAPPY' | 'CALM' | 'TIRED' | 'UPSET' | 'SICK';

export interface DailyLog {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  meals: string | null;
  nap: string | null;
  mood: ChildMood | null;
  bathroom: string | null;
  activitiesNote: string | null;
  generalNote: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}
export interface ListJournalResponse {
  items: DailyLog[];
  total: number;
}
export interface CreateDailyLogInput {
  studentId: string;
  date: string;
  meals?: string;
  nap?: string;
  mood?: ChildMood;
  bathroom?: string;
  activitiesNote?: string;
  generalNote?: string;
}
export type UpdateDailyLogInput = Omit<Partial<CreateDailyLogInput>, 'studentId' | 'date'>;

const BASE = '/api/journal';
export const listJournal = (token: string) => apiGet<ListJournalResponse>(BASE, token);
export const createDailyLog = (token: string, input: CreateDailyLogInput) =>
  apiPost<DailyLog>(BASE, token, input);
export const updateDailyLog = (token: string, id: string, input: UpdateDailyLogInput) =>
  apiPatch<DailyLog>(`${BASE}/${id}`, token, input);
export const deleteDailyLog = (token: string, id: string) => apiDelete(`${BASE}/${id}`, token);
