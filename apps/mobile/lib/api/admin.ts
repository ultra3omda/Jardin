import { fetchApi } from './client';

/**
 * Console plateforme (SUPER_ADMIN) : analytics + journal d'audit.
 * Miroir de apps/api/src/admin/platform-analytics.controller.ts + audit.controller.ts.
 */
export interface PlatformOverview {
  tenants: number;
  users: number;
  students: number;
  pendingDemoRequests: number;
  activeSubscriptions: number;
  mrr: string;
  arr: string;
  currency: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  tenantId: string | null;
  tenantName: string | null;
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AuditList {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export const ADMIN_OVERVIEW_KEY = ['admin', 'overview'] as const;
export const ADMIN_AUDIT_KEY = ['admin', 'audit'] as const;

export function getPlatformOverview(): Promise<PlatformOverview> {
  return fetchApi<PlatformOverview>('/api/admin/overview');
}

export function getAuditLogs(page = 1, pageSize = 20): Promise<AuditList> {
  return fetchApi<AuditList>(`/api/admin/audit?page=${page}&pageSize=${pageSize}`);
}
