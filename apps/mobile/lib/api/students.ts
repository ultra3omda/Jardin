import { useAuthStore } from '@/lib/auth/store';

/**
 * V2 — Module Élèves : mobile API client.
 * Miroir réduit de apps/web/lib/api/students.ts. Depuis Lot 1 (mobile gestion),
 * l'admin peut aussi créer / modifier / supprimer un élève depuis le mobile.
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
  classId: string | null;
  class: { id: string; name: string; level: string } | null;
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

/** Champs acceptés par POST /students (sous-ensemble suffisant pour le mobile). */
export interface CreateStudentInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'M' | 'F';
  classId?: string;
  classroom?: string;
  parentEmail: string;
  parentRelationType?: 'MOTHER' | 'FATHER' | 'LEGAL_GUARDIAN' | 'OTHER';
  enrollmentDate?: string;
  nationality?: string;
  motherTongue?: string;
  siblingsCount?: number;
  addressLine?: string;
  city?: string;
  medicalNotes?: string;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Not authenticated');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string>),
  };
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let body: { message?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* noop */
    }
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function listStudents(
  params: { page?: number; pageSize?: number; search?: string; classId?: string } = {},
): Promise<ListStudentsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  if (params.classId) qs.set('classId', params.classId);
  const q = qs.toString();
  return authed(`/api/students${q ? `?${q}` : ''}`);
}

export function getStudent(id: string): Promise<StudentSummary> {
  return authed(`/api/students/${id}`);
}

/** Drop empty strings / undefined so the API doesn't treat them as explicit nulls. */
function stripEmpty<T extends object>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function createStudent(input: CreateStudentInput): Promise<StudentSummary> {
  return authed('/api/students', { method: 'POST', body: JSON.stringify(stripEmpty(input)) });
}

export function updateStudent(id: string, input: UpdateStudentInput): Promise<StudentSummary> {
  return authed(`/api/students/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(stripEmpty(input)),
  });
}

export function deleteStudent(id: string): Promise<void> {
  return authed(`/api/students/${id}`, { method: 'DELETE' });
}
