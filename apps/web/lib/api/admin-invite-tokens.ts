'use client';

/**
 * Admin invite-tokens API client.
 * All requests proxy through `/api/admin` → NestJS `/api/admin/invite-tokens`.
 */

const BASE = '/api/admin/invite-tokens';

export type InviteRole = 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'STAFF';

export interface InviteToken {
  id: string;
  email: string;
  role: InviteRole;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface CreateInviteTokenPayload {
  email: string;
  role: InviteRole;
  expiresIn: '24h' | '48h' | '7d' | '30d';
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    throw new Error(body?.message ?? body?.code ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listInviteTokens(token: string): Promise<InviteToken[]> {
  const res = await fetch(BASE, { headers: authHeaders(token) });
  return ok(res);
}

export async function createInviteToken(
  token: string,
  payload: CreateInviteTokenPayload,
): Promise<InviteToken> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return ok(res);
}

export async function revokeInviteToken(
  token: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`HTTP ${res.status}`);
  }
}
