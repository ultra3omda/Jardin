import { fetchApi } from './client';

/**
 * Incidents de discipline. Admin (CRUD + résolution) · enseignant (créer + lire).
 * Miroir de apps/api/src/discipline/discipline.controller.ts.
 */
export type DisciplineSeverity = 'MINOR' | 'MAJOR' | 'SUSPENSION';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export const SEVERITY_LABELS: Record<DisciplineSeverity, string> = {
  MINOR: 'Mineur',
  MAJOR: 'Majeur',
  SUSPENSION: 'Exclusion',
};

export const SEVERITY_OPTIONS = (Object.keys(SEVERITY_LABELS) as DisciplineSeverity[]).map((v) => ({
  value: v,
  label: SEVERITY_LABELS[v],
}));

export const SEVERITY_COLOR: Record<DisciplineSeverity, string> = {
  MINOR: '#f59e0b',
  MAJOR: '#ef4444',
  SUSPENSION: '#991b1b',
};

export interface DisciplineIncident {
  id: string;
  studentId: string;
  studentName: string;
  type: DisciplineSeverity;
  occurredAt: string;
  description: string;
  sanction?: string | null;
  status: IncidentStatus;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

interface ListDisciplineResponse {
  items: DisciplineIncident[];
  total: number;
}

export interface CreateDisciplineInput {
  studentId: string;
  type: DisciplineSeverity;
  occurredAt: string;
  description: string;
  sanction?: string;
}

export const DISCIPLINE_KEY = ['discipline'] as const;

export function listDiscipline(): Promise<ListDisciplineResponse> {
  return fetchApi<ListDisciplineResponse>('/api/discipline');
}

export function createDiscipline(input: CreateDisciplineInput): Promise<DisciplineIncident> {
  return fetchApi<DisciplineIncident>('/api/discipline', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function resolveDiscipline(id: string, resolutionNote?: string): Promise<DisciplineIncident> {
  return fetchApi<DisciplineIncident>(`/api/discipline/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
}

export function deleteDiscipline(id: string): Promise<void> {
  return fetchApi<void>(`/api/discipline/${id}`, { method: 'DELETE' });
}
