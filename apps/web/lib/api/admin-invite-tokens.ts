'use client';

/**
 * Admin invite-tokens API client.
 * All requests proxy through `/api/admin` → NestJS `/api/admin/invite-tokens`.
 *
 * Field names mirror the API DTOs exactly (the proxy is a pure passthrough with
 * no field mapping): `invitedEmail` / `intendedRole` / `expiresInDays` on the way
 * in, and `invitedEmail` / `intendedRole` / `consumedAt` / `status` on the way out.
 */

const BASE = '/api/admin/invite-tokens';

export type InviteRole = 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'STAFF';

export type InviteTokenStatus = 'pending' | 'consumed' | 'expired';

/** List item returned by GET /admin/invite-tokens (matches InviteTokenListItemDto). */
export interface InviteToken {
  id: string;
  invitedEmail: string | null;
  intendedRole: InviteRole;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  status: InviteTokenStatus;
}

/**
 * Result of POST /admin/invite-tokens (matches InviteTokenCreatedDto).
 * The plaintext `token` and `url` are returned ONCE and never persisted
 * server-side — surface them to the operator immediately.
 */
export interface CreateInviteTokenResult {
  id: string;
  token: string;
  url: string;
  invitedEmail: string | null;
  intendedRole: InviteRole;
  expiresAt: string;
}

export interface CreateInviteTokenPayload {
  /** If set, the register flow rejects any email that does not match this one. */
  invitedEmail?: string;
  /** Role the invitee receives on registration. Defaults to SCHOOL_ADMIN server-side. */
  intendedRole?: InviteRole;
  /** Token lifetime in days (1–90). Defaults to 7 server-side. */
  expiresInDays?: number;
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
      message?: string | string[];
    };
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message;
    throw new Error(message ?? body?.code ?? `HTTP ${res.status}`);
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
): Promise<CreateInviteTokenResult> {
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
