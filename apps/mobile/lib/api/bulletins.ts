import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchApi } from './client';
import { useAuthStore } from '@/lib/auth/store';

/**
 * Bulletins officiels (PDF) côté parent. La liste vient de
 * GET /api/bulletins/my-children ; le téléchargement passe par
 * GET /api/bulletins/:studentId/:gradePeriodId/pdf (autorisé au PARENT pour ses
 * enfants). Téléchargement web-only (blob) — natif différé (expo-file-system).
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ChildBulletinEntry {
  gradePeriodId: string;
  gradePeriodName: string;
  schoolYear: string;
  generatedAt: string;
}

export interface ChildBulletins {
  studentId: string;
  studentName: string;
  className: string;
  bulletins: ChildBulletinEntry[];
}

export const MY_CHILDREN_BULLETINS_KEY = ['bulletins', 'my-children'] as const;

export function useMyChildrenBulletins() {
  return useQuery({
    queryKey: MY_CHILDREN_BULLETINS_KEY,
    queryFn: () => fetchApi<ChildBulletins[]>('/api/bulletins/my-children'),
  });
}

export const canDownloadBulletin = Platform.OS === 'web';

/** Web-only : récupère le PDF (authentifié) et déclenche le téléchargement. */
export async function downloadBulletinPdf(
  studentId: string,
  gradePeriodId: string,
  fileName: string,
): Promise<void> {
  if (Platform.OS !== 'web') return;
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(
    `${API_BASE}/api/bulletins/${encodeURIComponent(studentId)}/${encodeURIComponent(gradePeriodId)}/pdf`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  const blob = await res.blob();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w: any = globalThis;
  const url = w.URL.createObjectURL(blob);
  const a = w.document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  w.URL.revokeObjectURL(url);
}
