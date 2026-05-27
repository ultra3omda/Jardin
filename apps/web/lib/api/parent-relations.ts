'use client';

/**
 * V3-A — Lien parent ↔ élève : API client web.
 * Miroir de NestJS apps/api/src/parent-relations/parent-relations.controller.ts.
 * Toutes les requêtes passent par le proxy Next.js `/api/parent-relations*`.
 */
const BASE = '/api/parent-relations';

export type RelationType = 'FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN' | 'OTHER';

export interface ParentSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string;
}

export interface ParentRelation {
  id: string;
  parentUserId: string;
  studentId: string;
  relationType: RelationType;
  isPrimaryContact: boolean;
  createdAt: string;
  parent?: ParentSummary;
  student?: StudentSummary;
}

export interface ListParentRelationsResponse {
  items: ParentRelation[];
  total: number;
}

export interface CreateParentRelationPayload {
  /** Provide parentUserId (cuid2) OR parentEmail — backend resolves the email lookup. */
  parentUserId?: string;
  parentEmail?: string;
  studentId: string;
  relationType: RelationType;
  isPrimaryContact?: boolean;
}

export interface UpdateParentRelationPayload {
  relationType?: RelationType;
  isPrimaryContact?: boolean;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new Error(body?.code ?? body?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function listParentRelations(
  token: string,
  query: { studentId?: string; parentUserId?: string },
): Promise<ListParentRelationsResponse> {
  const sp = new URLSearchParams();
  if (query.studentId) sp.set('studentId', query.studentId);
  if (query.parentUserId) sp.set('parentUserId', query.parentUserId);
  const res = await fetch(`${BASE}?${sp.toString()}`, { headers: authHeaders(token) });
  return ok(res);
}

export async function createParentRelation(
  token: string,
  payload: CreateParentRelationPayload,
): Promise<ParentRelation> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return ok(res);
}

export async function updateParentRelation(
  token: string,
  id: string,
  payload: UpdateParentRelationPayload,
): Promise<ParentRelation> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return ok(res);
}

export async function deleteParentRelation(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`HTTP ${res.status}`);
  }
}
