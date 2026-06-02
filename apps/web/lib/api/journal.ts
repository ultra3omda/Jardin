import { apiGet, apiPost } from '@/lib/api/http';

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
  photoUrl: string | null;
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
  photoUrl?: string;
}
export interface JournalPhotoUploadResponse {
  uploadUrl: string;
  finalUrl: string;
  expiresIn: number;
}
const BASE = '/api/journal';
export const listJournal = (token: string) => apiGet<ListJournalResponse>(BASE, token);
export const createDailyLog = (token: string, input: CreateDailyLogInput) =>
  apiPost<DailyLog>(BASE, token, input);
export const getJournalPhotoUploadUrl = (token: string, contentType: string) =>
  apiPost<JournalPhotoUploadResponse>(`${BASE}/photo-upload-url`, token, { contentType });

/** Upload a photo to R2 (signed URL) and return its final public URL. */
export async function uploadJournalPhoto(token: string, file: File): Promise<string> {
  const signed = await getJournalPhotoUploadUrl(token, file.type);
  const put = await fetch(signed.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!put.ok) throw new Error(`Upload échoué (${put.status})`);
  return signed.finalUrl;
}
