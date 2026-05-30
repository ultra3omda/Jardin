import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type ActivityCategory = 'ART' | 'MUSIC' | 'SPORT' | 'OUTING' | 'OTHER';

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  category: ActivityCategory;
  scheduledAt: string | null;
  durationMin: number | null;
  location: string | null;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface ListActivitiesResponse {
  items: Activity[];
  total: number;
}
export interface CreateActivityInput {
  name: string;
  description?: string;
  category?: ActivityCategory;
  scheduledAt?: string;
  durationMin?: number;
  location?: string;
}
export type UpdateActivityInput = Partial<CreateActivityInput>;

const BASE = '/api/activities';
export const listActivities = (token: string) => apiGet<ListActivitiesResponse>(BASE, token);
export const createActivity = (token: string, input: CreateActivityInput) =>
  apiPost<Activity>(BASE, token, input);
export const updateActivity = (token: string, id: string, input: UpdateActivityInput) =>
  apiPatch<Activity>(`${BASE}/${id}`, token, input);
export const deleteActivity = (token: string, id: string) => apiDelete(`${BASE}/${id}`, token);
