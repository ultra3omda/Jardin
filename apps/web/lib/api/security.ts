import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type IncidentStatus = 'OPEN' | 'RESOLVED';
export type SecurityIncidentType = 'INTRUSION' | 'THEFT' | 'INJURY' | 'FIRE' | 'OTHER';
export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type DrillType = 'FIRE' | 'EARTHQUAKE' | 'LOCKDOWN' | 'OTHER';

// ─── Security incidents ───────────────────────────────────────────────────────
export interface SecurityIncident {
  id: string;
  type: SecurityIncidentType;
  severity: SecuritySeverity;
  location: string | null;
  occurredAt: string;
  description: string;
  status: IncidentStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  reportedById: string;
  resolvedById: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ListSecurityIncidentsResponse {
  items: SecurityIncident[];
  total: number;
}
export interface CreateSecurityIncidentInput {
  type: SecurityIncidentType;
  severity?: SecuritySeverity;
  location?: string;
  occurredAt: string;
  description: string;
}
export type UpdateSecurityIncidentInput = Partial<CreateSecurityIncidentInput>;

const INCIDENTS = '/api/security-incidents';
export const listSecurityIncidents = (token: string) =>
  apiGet<ListSecurityIncidentsResponse>(INCIDENTS, token);
export const createSecurityIncident = (token: string, input: CreateSecurityIncidentInput) =>
  apiPost<SecurityIncident>(INCIDENTS, token, input);
export const updateSecurityIncident = (
  token: string,
  id: string,
  input: UpdateSecurityIncidentInput,
) => apiPatch<SecurityIncident>(`${INCIDENTS}/${id}`, token, input);
export const resolveSecurityIncident = (token: string, id: string, resolutionNote?: string) =>
  apiPost<SecurityIncident>(`${INCIDENTS}/${id}/resolve`, token, { resolutionNote });
export const deleteSecurityIncident = (token: string, id: string) =>
  apiDelete(`${INCIDENTS}/${id}`, token);

// ─── Visitor logs ─────────────────────────────────────────────────────────────
export interface VisitorLog {
  id: string;
  visitorName: string;
  reason: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  badgeNumber: string | null;
  recordedById: string;
  createdAt: string;
  updatedAt: string;
}
export interface ListVisitorLogsResponse {
  items: VisitorLog[];
  total: number;
}
export interface CreateVisitorLogInput {
  visitorName: string;
  reason?: string;
  checkInAt: string;
  checkOutAt?: string;
  badgeNumber?: string;
}
export type UpdateVisitorLogInput = Partial<CreateVisitorLogInput>;

const VISITORS = '/api/visitor-logs';
export const listVisitorLogs = (token: string) => apiGet<ListVisitorLogsResponse>(VISITORS, token);
export const createVisitorLog = (token: string, input: CreateVisitorLogInput) =>
  apiPost<VisitorLog>(VISITORS, token, input);
export const updateVisitorLog = (token: string, id: string, input: UpdateVisitorLogInput) =>
  apiPatch<VisitorLog>(`${VISITORS}/${id}`, token, input);
export const deleteVisitorLog = (token: string, id: string) => apiDelete(`${VISITORS}/${id}`, token);

// ─── Safety drills ────────────────────────────────────────────────────────────
export interface SafetyDrill {
  id: string;
  type: DrillType;
  conductedAt: string;
  durationMin: number | null;
  notes: string | null;
  recordedById: string;
  createdAt: string;
  updatedAt: string;
}
export interface ListSafetyDrillsResponse {
  items: SafetyDrill[];
  total: number;
}
export interface CreateSafetyDrillInput {
  type: DrillType;
  conductedAt: string;
  durationMin?: number;
  notes?: string;
}
export type UpdateSafetyDrillInput = Partial<CreateSafetyDrillInput>;

const DRILLS = '/api/safety-drills';
export const listSafetyDrills = (token: string) => apiGet<ListSafetyDrillsResponse>(DRILLS, token);
export const createSafetyDrill = (token: string, input: CreateSafetyDrillInput) =>
  apiPost<SafetyDrill>(DRILLS, token, input);
export const updateSafetyDrill = (token: string, id: string, input: UpdateSafetyDrillInput) =>
  apiPatch<SafetyDrill>(`${DRILLS}/${id}`, token, input);
export const deleteSafetyDrill = (token: string, id: string) => apiDelete(`${DRILLS}/${id}`, token);
