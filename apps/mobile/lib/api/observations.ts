import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * G3 — Observations (fil d'observations). Lecture parent + saisie rapide
 * enseignant/admin. Miroir de
 * apps/api/src/observations/observations.controller.ts (routes /api/observations).
 *
 * Côté PARENT, le GET est déjà scopé serveur à ses enfants + visibleToParent=true ;
 * le client se contente de le consommer.
 */
export type ObservationCategory =
  | 'LANGAGE'
  | 'MOTRICITE'
  | 'SOCIAL'
  | 'AUTONOMIE'
  | 'COGNITIF'
  | 'ARTISTIQUE'
  | 'AUTRE';

export type ObservationMediaKind = 'PHOTO' | 'VIDEO';

export interface ObservationMedia {
  id: string;
  kind: ObservationMediaKind;
  url: string;
}

export interface Observation {
  id: string;
  studentId: string;
  category: ObservationCategory;
  title: string;
  content: string;
  observedAt: string;
  visibleToParent: boolean;
  media: ObservationMedia[];
}

export interface CreateObservationInput {
  studentId: string;
  category: ObservationCategory;
  title: string;
  content: string;
  /** Date d'observation au format ISO. */
  observedAt: string;
  visibleToParent?: boolean;
}

export const OBSERVATIONS_KEYS = {
  all: ['observations'] as const,
};

const WRITE_ROLES = ['SCHOOL_ADMIN', 'TEACHER'];

export function canWriteObservation(role: string | undefined): boolean {
  return role !== undefined && WRITE_ROLES.includes(role);
}

export const OBSERVATION_CATEGORIES: { value: ObservationCategory; label: string }[] = [
  { value: 'LANGAGE', label: 'Langage' },
  { value: 'MOTRICITE', label: 'Motricité' },
  { value: 'SOCIAL', label: 'Social / émotionnel' },
  { value: 'AUTONOMIE', label: 'Autonomie' },
  { value: 'COGNITIF', label: 'Cognitif' },
  { value: 'ARTISTIQUE', label: 'Artistique' },
  { value: 'AUTRE', label: 'Autre' },
];

const CATEGORY_LABELS: Record<ObservationCategory, string> = {
  LANGAGE: 'Langage',
  MOTRICITE: 'Motricité',
  SOCIAL: 'Social',
  AUTONOMIE: 'Autonomie',
  COGNITIF: 'Cognitif',
  ARTISTIQUE: 'Artistique',
  AUTRE: 'Autre',
};

const CATEGORY_COLORS: Record<ObservationCategory, string> = {
  LANGAGE: '#3b82f6',
  MOTRICITE: '#02a896',
  SOCIAL: '#ec4899',
  AUTONOMIE: '#f08d00',
  COGNITIF: '#671bf0',
  ARTISTIQUE: '#ff4318',
  AUTRE: '#475569',
};

export function categoryLabel(category: ObservationCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function categoryColor(category: ObservationCategory): string {
  return CATEGORY_COLORS[category] ?? '#475569';
}

export function formatObservedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Fil d'observations. Activé pour tout rôle authentifié — le serveur scope la
 * réponse (le parent ne voit que ses enfants + visibleToParent).
 */
export function useObservations(role: string | undefined) {
  return useQuery({
    queryKey: OBSERVATIONS_KEYS.all,
    queryFn: () => fetchApi<Observation[]>('/api/observations'),
    enabled: role !== undefined,
    staleTime: 30_000,
  });
}

export function useCreateObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateObservationInput) =>
      fetchApi<Observation>('/api/observations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: OBSERVATIONS_KEYS.all });
    },
  });
}
