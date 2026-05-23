'use client';

import type { TenantBrand } from '@ecole-saas/shared';

import type { AuthSessionResponse, MeResponse } from '@/lib/auth/types';
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
} from '@/lib/validation/auth.schemas';

/**
 * The web calls its OWN Next.js Route Handlers (NOT the NestJS API directly),
 * because the Route Handlers proxy auth + manage the httpOnly refresh cookie.
 */
const PROXY_BASE = '/api/auth';
const USERS_PROXY_BASE = '/api/users';

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

export async function verifyEmail(token: string): Promise<{ verified: true; userId: string }> {
  return jsonRequest<{ verified: true; userId: string }>(`${PROXY_BASE}/email/verify`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function resendVerificationEmail(accessToken: string): Promise<void> {
  return jsonRequest<void>(`${PROXY_BASE}/email/resend`, {
    method: 'POST',
    auth: accessToken,
  });
}

export async function forgotPassword(values: ForgotPasswordFormValues): Promise<void> {
  // Normalise empty optional tenantSlug to undefined for the API
  const payload = {
    email: values.email,
    ...(values.tenantSlug && values.tenantSlug.length > 0 ? { tenantSlug: values.tenantSlug } : {}),
  };
  return jsonRequest<void>(`${PROXY_BASE}/password/forgot`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(args: {
  token: string;
  newPassword: string;
}): Promise<{ success: true; userId: string }> {
  return jsonRequest<{ success: true; userId: string }>(`${PROXY_BASE}/password/reset`, {
    method: 'POST',
    body: JSON.stringify(args),
  });
}

// V1.5 — /api/users/me* endpoints
// =============================================================================

export async function getProfile(accessToken: string): Promise<MeResponse> {
  return jsonRequest<MeResponse>(`${USERS_PROXY_BASE}/me`, {
    method: 'GET',
    auth: accessToken,
  });
}

export async function updateProfile(
  accessToken: string,
  values: { firstName?: string; lastName?: string; locale?: string },
): Promise<MeResponse> {
  return jsonRequest<MeResponse>(`${USERS_PROXY_BASE}/me`, {
    method: 'PATCH',
    auth: accessToken,
    body: JSON.stringify(values),
  });
}

export async function changeMyPassword(
  accessToken: string,
  values: { currentPassword: string; newPassword: string },
): Promise<void> {
  return jsonRequest<void>(`${USERS_PROXY_BASE}/me/password`, {
    method: 'POST',
    auth: accessToken,
    body: JSON.stringify(values),
  });
}

export interface SessionListItem {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export async function listSessions(accessToken: string): Promise<SessionListItem[]> {
  return jsonRequest<SessionListItem[]>(`${USERS_PROXY_BASE}/me/sessions`, {
    method: 'GET',
    auth: accessToken,
  });
}

export async function revokeSession(accessToken: string, sessionId: string): Promise<void> {
  return jsonRequest<void>(`${USERS_PROXY_BASE}/me/sessions/${sessionId}`, {
    method: 'DELETE',
    auth: accessToken,
  });
}

export interface ExportResultResponse {
  key: string;
  downloadUrl: string;
  expiresAt: string;
}

export async function requestDataExport(accessToken: string): Promise<ExportResultResponse> {
  return jsonRequest<ExportResultResponse>(`${USERS_PROXY_BASE}/me/export`, {
    method: 'POST',
    auth: accessToken,
  });
}

export async function deleteAccount(accessToken: string): Promise<void> {
  return jsonRequest<void>(`${USERS_PROXY_BASE}/me`, {
    method: 'DELETE',
    auth: accessToken,
  });
}

// ============================================================================
// V1.6 — Tenant branding (admin)
// ============================================================================

const ADMIN_PROXY_BASE = '/api/admin';

export async function getBranding(accessToken: string): Promise<TenantBrand> {
  return jsonRequest<TenantBrand>(`${ADMIN_PROXY_BASE}/tenant/branding`, {
    method: 'GET',
    auth: accessToken,
  });
}

export async function updateBranding(
  accessToken: string,
  patch: Partial<TenantBrand>,
): Promise<TenantBrand> {
  return jsonRequest<TenantBrand>(`${ADMIN_PROXY_BASE}/tenant/branding`, {
    method: 'PATCH',
    auth: accessToken,
    body: JSON.stringify(patch),
  });
}

export async function resetBranding(accessToken: string): Promise<TenantBrand> {
  return jsonRequest<TenantBrand>(`${ADMIN_PROXY_BASE}/tenant/branding`, {
    method: 'DELETE',
    auth: accessToken,
  });
}

export async function getBrandingUploadUrl(
  accessToken: string,
  kind: 'logo' | 'favicon',
  contentType: string,
): Promise<{ uploadUrl: string; finalUrl: string }> {
  return jsonRequest<{ uploadUrl: string; finalUrl: string }>(
    `${ADMIN_PROXY_BASE}/tenant/branding/upload-url`,
    {
      method: 'POST',
      auth: accessToken,
      body: JSON.stringify({ kind, contentType }),
    },
  );
}
