import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type DisciplineSeverity = 'MINOR' | 'MAJOR' | 'SUSPENSION';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface DisciplineIncident {
  id: string;
  studentId: string;
  studentName: string;
  classId: string | null;
  type: DisciplineSeverity;
  occurredAt: string;
  description: string;
  sanction: string | null;
  status: IncidentStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  reportedById: string;
  resolvedById: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ListDisciplineResponse {
  items: DisciplineIncident[];
  total: number;
}
export interface CreateDisciplineInput {
  studentId: string;
  classId?: string;
  type: DisciplineSeverity;
  occurredAt: string;
  description: string;
  sanction?: string;
}
export type UpdateDisciplineInput = Partial<Omit<CreateDisciplineInput, 'studentId' | 'classId'>>;

const BASE = '/api/discipline';
export const listDiscipline = (token: string) => apiGet<ListDisciplineResponse>(BASE, token);
export const createIncident = (token: string, input: CreateDisciplineInput) =>
  apiPost<DisciplineIncident>(BASE, token, input);
export const updateIncident = (token: string, id: string, input: UpdateDisciplineInput) =>
  apiPatch<DisciplineIncident>(`${BASE}/${id}`, token, input);
export const resolveIncident = (token: string, id: string, resolutionNote?: string) =>
  apiPost<DisciplineIncident>(`${BASE}/${id}/resolve`, token, { resolutionNote });
export const deleteIncident = (token: string, id: string) => apiDelete(`${BASE}/${id}`, token);
