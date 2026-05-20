'use client';

import type { AuthSessionResponse, MeResponse } from '@/lib/auth/types';
import type { LoginFormValues, RegisterFormValues } from '@/lib/validation/auth.schemas';

/**
 * The web calls its OWN Next.js Route Handlers (NOT the NestJS API directly),
 * because the Route Handlers proxy auth + manage the httpOnly refresh cookie.
 */
const PROXY_BASE = '/api/auth';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* response had no JSON body */
  }
  const obj = (body ?? {}) as { message?: string; code?: string };
  return new ApiError(
    response.status,
    obj.message ?? `Request failed with status ${response.status}`,
    obj.code,
    body,
  );
}

async function jsonRequest<T>(
  path: string,
  init: RequestInit & { auth?: string },
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (init.auth) {
    headers.set('Authorization', `Bearer ${init.auth}`);
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function login(values: LoginFormValues): Promise<AuthSessionResponse> {
  const body: Record<string, unknown> = { ...values };
  if (!body.tenantSlug) delete body.tenantSlug;
  return jsonRequest<AuthSessionResponse>(`${PROXY_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function register(values: RegisterFormValues): Promise<AuthSessionResponse> {
  return jsonRequest<AuthSessionResponse>(`${PROXY_BASE}/register`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export async function refresh(): Promise<AuthSessionResponse> {
  return jsonRequest<AuthSessionResponse>(`${PROXY_BASE}/refresh`, {
    method: 'POST',
  });
}

export async function logout(): Promise<void> {
  return jsonRequest<void>(`${PROXY_BASE}/logout`, {
    method: 'POST',
  });
}

export async function me(accessToken: string): Promise<MeResponse> {
  return jsonRequest<MeResponse>(`${PROXY_BASE}/me`, {
    method: 'GET',
    auth: accessToken,
  });
}
