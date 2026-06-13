import { fetchApi } from './client';

/**
 * Sécurité : incidents, registre des visiteurs, exercices. Admin / personnel.
 * Miroir de apps/api/src/security/*.controller.ts.
 */
export type IncidentStatus = 'OPEN' | 'RESOLVED';
export type SecurityIncidentType = 'INTRUSION' | 'THEFT' | 'INJURY' | 'FIRE' | 'OTHER';
export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type DrillType = 'FIRE' | 'EARTHQUAKE' | 'LOCKDOWN' | 'OTHER';

export const INCIDENT_TYPE_LABELS: Record<SecurityIncidentType, string> = {
  INTRUSION: 'Intrusion',
  THEFT: 'Vol',
  INJURY: 'Blessure',
  FIRE: 'Incendie',
  OTHER: 'Autre',
};
export const SEVERITY_LABELS: Record<SecuritySeverity, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
};
export const SEVERITY_COLOR: Record<SecuritySeverity, string> = {
  LOW: '#f59e0b',
  MEDIUM: '#f97316',
  HIGH: '#ef4444',
};
export const DRILL_TYPE_LABELS: Record<DrillType, string> = {
  FIRE: 'Incendie',
  EARTHQUAKE: 'Séisme',
  LOCKDOWN: 'Confinement',
  OTHER: 'Autre',
};

function options<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
export const INCIDENT_TYPE_OPTIONS = options(INCIDENT_TYPE_LABELS);
export const SEVERITY_OPTIONS = options(SEVERITY_LABELS);
export const DRILL_TYPE_OPTIONS = options(DRILL_TYPE_LABELS);

// ─── Incidents ────────────────────────────────────────────────────────────────
export interface SecurityIncident {
  id: string;
  type: SecurityIncidentType;
  severity: SecuritySeverity;
  location: string | null;
  occurredAt: string;
  description: string;
  status: IncidentStatus;
  createdAt: string;
}
export interface CreateSecurityIncidentInput {
  type: SecurityIncidentType;
  severity?: SecuritySeverity;
  location?: string;
  occurredAt: string;
  description: string;
}

export const SECURITY_INCIDENTS_KEY = ['security', 'incidents'] as const;
export function listSecurityIncidents(): Promise<{ items: SecurityIncident[]; total: number }> {
  return fetchApi('/api/security-incidents');
}
export function createSecurityIncident(input: CreateSecurityIncidentInput): Promise<SecurityIncident> {
  return fetchApi('/api/security-incidents', { method: 'POST', body: JSON.stringify(input) });
}
export function resolveSecurityIncident(id: string, resolutionNote?: string): Promise<SecurityIncident> {
  return fetchApi(`/api/security-incidents/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
}
export function deleteSecurityIncident(id: string): Promise<void> {
  return fetchApi(`/api/security-incidents/${id}`, { method: 'DELETE' });
}

// ─── Visiteurs ──────────────────────────────────────────────────────────────
export interface VisitorLog {
  id: string;
  visitorName: string;
  reason: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  badgeNumber: string | null;
  createdAt: string;
}
export interface CreateVisitorLogInput {
  visitorName: string;
  reason?: string;
  checkInAt: string;
  badgeNumber?: string;
}

export const VISITOR_LOGS_KEY = ['security', 'visitors'] as const;
export function listVisitorLogs(): Promise<{ items: VisitorLog[]; total: number }> {
  return fetchApi('/api/visitor-logs');
}
export function createVisitorLog(input: CreateVisitorLogInput): Promise<VisitorLog> {
  return fetchApi('/api/visitor-logs', { method: 'POST', body: JSON.stringify(input) });
}
export function deleteVisitorLog(id: string): Promise<void> {
  return fetchApi(`/api/visitor-logs/${id}`, { method: 'DELETE' });
}

// ─── Exercices ──────────────────────────────────────────────────────────────
export interface SafetyDrill {
  id: string;
  type: DrillType;
  conductedAt: string;
  durationMin: number | null;
  notes: string | null;
  createdAt: string;
}
export interface CreateSafetyDrillInput {
  type: DrillType;
  conductedAt: string;
  durationMin?: number;
  notes?: string;
}

export const SAFETY_DRILLS_KEY = ['security', 'drills'] as const;
export function listSafetyDrills(): Promise<{ items: SafetyDrill[]; total: number }> {
  return fetchApi('/api/safety-drills');
}
export function createSafetyDrill(input: CreateSafetyDrillInput): Promise<SafetyDrill> {
  return fetchApi('/api/safety-drills', { method: 'POST', body: JSON.stringify(input) });
}
export function deleteSafetyDrill(id: string): Promise<void> {
  return fetchApi(`/api/safety-drills/${id}`, { method: 'DELETE' });
}
