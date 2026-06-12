import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { ApiError, fetchApi, getAccessToken } from './client';

/**
 * G5 — Rapports d'activité (cahier d'activités parents). Lecture parent :
 * liste des activités (déjà scopée serveur) + rapport PDF téléchargeable.
 * Miroir de apps/api/src/activities/{activities,activity-report}.controller.ts
 * (routes /api/activities).
 *
 * Côté PARENT, le GET /api/activities est déjà scopé serveur ; le client le
 * consomme tel quel. Le PDF est protégé par JWT : on le récupère avec l'en-tête
 * Authorization puis on l'ouvre (object URL web / data URL natif).
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ActivityCategory = 'ART' | 'MUSIC' | 'SPORT' | 'OUTING' | 'OTHER';

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  category: ActivityCategory;
  scheduledAt: string | null;
  durationMin: number | null;
  location: string | null;
  responsibleName: string | null;
  className: string | null;
  participantCount: number;
}

interface ListActivitiesResponse {
  items: Activity[];
  total: number;
}

export interface ActivityReport {
  id: string;
  activityId: string;
  title: string;
  summary: string;
  photoUrls: string[];
  visibleToParent: boolean;
  generatedAt: string;
}

export const ACTIVITIES_KEYS = {
  all: ['activities'] as const,
  report: (activityId: string) => ['activities', activityId, 'report'] as const,
};

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  ART: 'Arts plastiques',
  MUSIC: 'Musique',
  SPORT: 'Sport',
  OUTING: 'Sortie',
  OTHER: 'Autre',
};

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  ART: '#ff4318',
  MUSIC: '#671bf0',
  SPORT: '#02a896',
  OUTING: '#f08d00',
  OTHER: '#475569',
};

export function activityCategoryLabel(category: ActivityCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function activityCategoryColor(category: ActivityCategory): string {
  return CATEGORY_COLORS[category] ?? '#475569';
}

export function formatActivityDate(iso: string | null): string {
  if (!iso) return 'Date à définir';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Liste des activités. Activée pour tout rôle authentifié — le serveur scope
 * la réponse (le parent ne voit que les activités de ses enfants).
 */
export function useActivities(role: string | undefined) {
  return useQuery({
    queryKey: ACTIVITIES_KEYS.all,
    queryFn: async () => {
      const res = await fetchApi<ListActivitiesResponse>('/api/activities');
      return res.items;
    },
    enabled: role !== undefined,
    staleTime: 30_000,
  });
}

/**
 * Rapport d'une activité (ou null si aucun). Sert à savoir si un PDF est
 * disponible avant d'afficher le bouton de téléchargement.
 */
export function useActivityReport(activityId: string, enabled: boolean) {
  return useQuery({
    queryKey: ACTIVITIES_KEYS.report(activityId),
    queryFn: async () => {
      try {
        return await fetchApi<ActivityReport | null>(`/api/activities/${activityId}/report`);
      } catch (err) {
        // Pas de rapport visible / inexistant : on traite comme « absent ».
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          return null;
        }
        throw err;
      }
    },
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Récupère le PDF du rapport (avec en-tête Authorization, route JWT) et l'ouvre.
 * Web : object URL dans un nouvel onglet. Natif : data URL via Linking.
 * Retourne false si l'ouverture échoue (le caller affiche un feedback).
 */
export async function openActivityReportPdf(activityId: string): Promise<boolean> {
  const token = getAccessToken();
  const response = await fetch(`${BASE_URL}/api/activities/${activityId}/report/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }
  const blob = await response.blob();

  if (Platform.OS === 'web' && typeof URL !== 'undefined' && 'createObjectURL' in URL) {
    const objectUrl = URL.createObjectURL(blob);
    const opened = globalThis.open?.(objectUrl, '_blank');
    return opened != null;
  }

  const dataUrl = await blobToDataUrl(blob);
  const can = await Linking.canOpenURL(dataUrl);
  if (!can) return false;
  await Linking.openURL(dataUrl);
  return true;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('PDF_READ_FAILED'));
    reader.onloadend = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}
