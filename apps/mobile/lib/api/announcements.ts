import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * Annonces de l'établissement. Lecture pour tous ; création/suppression
 * exposées à l'admin côté mobile. Miroir de
 * apps/api/src/announcements/announcements.controller.ts.
 */
export type AnnouncementAudience = 'ALL' | 'TEACHERS' | 'PARENTS' | 'STAFF';

/**
 * G8 — Une annonce peut être une circulaire (CIRCULAIRE) accompagnée d'un PDF
 * public (attachmentUrl, URL R2 ouvrable directement) ou une simple actualité.
 */
export type AnnouncementKind = 'NEWS' | 'CIRCULAIRE';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  authorId: string;
  authorName: string;
  publishAt: string;
  createdAt: string;
  updatedAt: string;
  kind: AnnouncementKind;
  /** URL R2 publique du PDF de la circulaire (présent si kind === 'CIRCULAIRE'). */
  attachmentUrl?: string;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  audience?: AnnouncementAudience;
}

interface ListAnnouncementsResponse {
  items: Announcement[];
  total: number;
}

export const ANNOUNCEMENTS_KEY = ['announcements'] as const;

export function useAnnouncements() {
  return useQuery({
    queryKey: ANNOUNCEMENTS_KEY,
    queryFn: () => fetchApi<ListAnnouncementsResponse>('/api/announcements'),
  });
}

export function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  return fetchApi<Announcement>('/api/announcements', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteAnnouncement(id: string): Promise<void> {
  return fetchApi<void>(`/api/announcements/${id}`, { method: 'DELETE' });
}
