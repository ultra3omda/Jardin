import { adminRequest } from './admin-client';

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AuditListResponse {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditQuery {
  action?: string;
  tenantId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function listAudit(token: string, query: AuditQuery): Promise<AuditListResponse> {
  const params = new URLSearchParams();
  if (query.action) params.set('action', query.action);
  if (query.tenantId) params.set('tenantId', query.tenantId);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return adminRequest<AuditListResponse>(`/audit${qs ? `?${qs}` : ''}`, token);
}
