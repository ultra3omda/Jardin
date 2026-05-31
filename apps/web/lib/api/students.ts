'use client';

import type {
  CreateStudentFormValues,
  UpdateStudentFormValues,
} from '@/lib/validation/student.schemas';

/**
 * V2 — Module Élèves : API client web.
 * Miroir de l'API NestJS (apps/api/src/students/students.controller.ts).
 * Toutes les requêtes passent par le proxy Next.js `/api/students*` qui forward
 * vers `NEXT_PUBLIC_API_URL` (pattern admin-tenants.ts).
 */
const BASE = '/api/students';

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

export interface BulkImportResponse {
  imported: number;
  valid: number;
  errors: { row: number; message: string }[];
  dryRun: boolean;
}

export interface PhotoUploadResponse {
  uploadUrl: string;
  finalUrl: string;
  expiresIn: number;
}

export class StudentsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

async function jsonRequest<T>(
  path: string,
  init: RequestInit & { auth: string },
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${init.auth}`);
  if (
    init.method &&
    !['GET', 'DELETE'].includes(init.method) &&
    !(init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    let body: { message?: string; code?: string } = {};
    try {
      body = await response.json();
    } catch {
      /* noop */
    }
    throw new StudentsApiError(
      response.status,
      body.message ?? `Request failed with ${response.status}`,
      body.code,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function listStudents(
  token: string,
  params: { page?: number; pageSize?: number; search?: string; classId?: string } = {},
): Promise<ListStudentsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  if (params.classId) qs.set('classId', params.classId);
  const q = qs.toString();
  return jsonRequest(`${BASE}${q ? `?${q}` : ''}`, { method: 'GET', auth: token });
}

export async function getStudent(token: string, id: string): Promise<StudentSummary> {
  return jsonRequest(`${BASE}/${id}`, { method: 'GET', auth: token });
}

export async function createStudent(
  token: string,
  values: CreateStudentFormValues,
): Promise<StudentSummary> {
  return jsonRequest(BASE, {
    method: 'POST',
    auth: token,
    body: JSON.stringify(stripEmpty(values)),
  });
}

export async function updateStudent(
  token: string,
  id: string,
  values: UpdateStudentFormValues,
): Promise<StudentSummary> {
  return jsonRequest(`${BASE}/${id}`, {
    method: 'PATCH',
    auth: token,
    body: JSON.stringify(stripEmpty(values)),
  });
}

export async function deleteStudent(token: string, id: string): Promise<void> {
  return jsonRequest(`${BASE}/${id}`, { method: 'DELETE', auth: token });
}

export async function bulkImportStudents(
  token: string,
  file: File,
  dryRun: boolean,
): Promise<BulkImportResponse> {
  const fd = new FormData();
  fd.append('file', file);
  return jsonRequest(`${BASE}/bulk-import?dryRun=${dryRun ? 'true' : 'false'}`, {
    method: 'POST',
    auth: token,
    body: fd,
  });
}

export async function getPhotoUploadUrl(
  token: string,
  id: string,
  contentType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<PhotoUploadResponse> {
  return jsonRequest(`${BASE}/${id}/photo-upload-url`, {
    method: 'POST',
    auth: token,
    body: JSON.stringify({ contentType }),
  });
}

/** Drop empty strings / undefined so the API doesn't see them as explicit nulls. */
function stripEmpty(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === undefined) continue;
    out[k] = v;
  }
  return out;
}
