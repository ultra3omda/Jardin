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
  responsibleUserId: string | null;
  responsibleName: string | null;
  classId: string | null;
  className: string | null;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface ListActivitiesResponse {
  items: Activity[];
  total: number;
}
export interface ActivityParticipation {
  id: string;
  studentId: string;
  studentName: string;
}
export interface CreateActivityInput {
  name: string;
  description?: string;
  category?: ActivityCategory;
  scheduledAt?: string;
  durationMin?: number;
  location?: string;
  responsibleUserId?: string | null;
  classId?: string | null;
}
export type UpdateActivityInput = Partial<CreateActivityInput>;

const BASE = '/api/activities';
export const listActivities = (token: string) => apiGet<ListActivitiesResponse>(BASE, token);
export const createActivity = (token: string, input: CreateActivityInput) =>
  apiPost<Activity>(BASE, token, input);
export const updateActivity = (token: string, id: string, input: UpdateActivityInput) =>
  apiPatch<Activity>(`${BASE}/${id}`, token, input);
export const deleteActivity = (token: string, id: string) => apiDelete(`${BASE}/${id}`, token);

// ── Participations (élèves inscrits à une activité) ──────────────────────────
export const listParticipations = (token: string, activityId: string) =>
  apiGet<ActivityParticipation[]>(`${BASE}/${activityId}/participations`, token);
export const addParticipation = (token: string, activityId: string, studentId: string) =>
  apiPost<ActivityParticipation>(`${BASE}/${activityId}/participations`, token, { studentId });
export const removeParticipation = (token: string, activityId: string, studentId: string) =>
  apiDelete(`${BASE}/${activityId}/participations/${studentId}`, token);

/** Auto-remplit les participants depuis les présents du jour (classe de l'atelier). */
export const fillParticipationsFromAttendance = (
  token: string,
  activityId: string,
  date?: string,
) =>
  apiPost<ActivityParticipation[]>(
    `${BASE}/${activityId}/participations/fill-from-attendance${date ? `?date=${date}` : ''}`,
    token,
    {},
  );
