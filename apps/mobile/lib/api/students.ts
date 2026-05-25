import { useAuthStore } from '@/lib/auth/store';

/**
 * V2 — Module Élèves : mobile API client (READ-ONLY).
 * Mirroir réduit de apps/web/lib/api/students.ts.
 * Mutations (create/update/delete/bulk-import) restent web-only en V2.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface StudentSummary {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'M' | 'F';
  nationality: string | null;
  classroom: string;
  enrollmentDate: string;
  previousSchooling: string | null;
  parentEmail: string;
  siblingsCount: number;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  motherTongue: string | null;
  medicalNotes: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListStudentsResponse {
  items: StudentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

async function authed<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let body: { message?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* noop */
    }
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function listStudents(
  params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<ListStudentsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  const q = qs.toString();
  return authed(`/api/students${q ? `?${q}` : ''}`);
}

export function getStudent(id: string): Promise<StudentSummary> {
  return authed(`/api/students/${id}`);
}
