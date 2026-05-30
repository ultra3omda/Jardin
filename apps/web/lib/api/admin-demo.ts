import { adminRequest } from './admin-client';

export const DEMO_STATUSES = ['NEW', 'CONTACTED', 'SCHEDULED', 'DONE', 'DECLINED'] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const DEMO_STATUS_LABELS: Record<DemoStatus, string> = {
  NEW: 'Nouvelle',
  CONTACTED: 'Contactée',
  SCHEDULED: 'Planifiée',
  DONE: 'Terminée',
  DECLINED: 'Refusée',
};

export interface DemoRequestAdmin {
  requestId: string;
  email: string;
  schoolName: string;
  studentsCount: number | null;
  locale: string | null;
  receivedAt: string;
  status: DemoStatus;
  note: string | null;
  statusUpdatedAt: string | null;
}

export function listDemoRequests(token: string): Promise<DemoRequestAdmin[]> {
  return adminRequest<DemoRequestAdmin[]>('/demo-requests', token);
}

export function updateDemoStatus(
  token: string,
  requestId: string,
  payload: { status: DemoStatus; note?: string },
): Promise<DemoRequestAdmin> {
  return adminRequest<DemoRequestAdmin>(
    `/demo-requests/${encodeURIComponent(requestId)}/status`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}
