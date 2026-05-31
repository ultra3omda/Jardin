'use client';

import type { TenantBrand } from '@ecole-saas/shared';

import type { CreateTenantFormValues } from '@/lib/validation/tenant.schemas';

const ADMIN_BASE = '/api/admin';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  type: 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED';
  locale: 'fr' | 'en' | 'ar' | 'es';
  brand: TenantBrand | null;
  createdAt: string;
  usersCount: number;
  adminOnboarded: boolean;
  inviteStatus: 'pending' | 'consumed' | 'expired' | null;
}

export interface InviteSummary {
  id: string;
  url: string;
  expiresAt: string;
}

export interface CreateTenantResponse {
  tenant: TenantSummary;
  invite: InviteSummary;
  inviteEmailSent: boolean;
}

export class AdminApiError extends Error {
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
  if (init.method && !['GET', 'DELETE'].includes(init.method)) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    let body: { message?: string; code?: string } = {};
    try { body = await response.json(); } catch { /* noop */ }
    throw new AdminApiError(
      response.status,
      body.message ?? `Request failed with ${response.status}`,
      body.code,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function listTenants(token: string): Promise<TenantSummary[]> {
  return jsonRequest(`${ADMIN_BASE}/tenants`, { method: 'GET', auth: token });
}

export async function getTenant(token: string, id: string): Promise<TenantSummary> {
  return jsonRequest(`${ADMIN_BASE}/tenants/${id}`, { method: 'GET', auth: token });
}

export async function createTenant(
  token: string,
  values: CreateTenantFormValues,
): Promise<CreateTenantResponse> {
  const payload: Record<string, unknown> = { ...values };
  if (!payload.primaryColor) delete payload.primaryColor;
  return jsonRequest(`${ADMIN_BASE}/tenants`, {
    method: 'POST',
    auth: token,
    body: JSON.stringify(payload),
  });
}

export async function resendInvite(token: string, id: string): Promise<InviteSummary> {
  return jsonRequest(`${ADMIN_BASE}/tenants/${id}/resend-invite`, {
    method: 'POST',
    auth: token,
  });
}

export type PersonaRole = 'TEACHER' | 'PARENT' | 'STAFF';

export interface PersonaInput {
  role: PersonaRole;
  email: string;
  firstName: string;
  lastName: string;
}

export interface SeededPersona {
  email: string;
  role: PersonaRole;
  inviteUrl: string;
  inviteExpiresAt: string;
}

export interface SeedPersonasResponse {
  created: SeededPersona[];
  skipped: string[];
}

/** Seed initial teacher/parent/staff accounts (+ invites) for a freshly created tenant. */
export async function seedTenantPersonas(
  token: string,
  tenantId: string,
  personas: PersonaInput[],
): Promise<SeedPersonasResponse> {
  return jsonRequest(`${ADMIN_BASE}/tenants/${tenantId}/personas`, {
    method: 'POST',
    auth: token,
    body: JSON.stringify({ personas }),
  });
}
