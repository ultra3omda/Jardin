import { fetchApi, setAccessToken } from './client';
import {
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  deleteTenantSlug,
} from '@/lib/auth/secure-storage';
import type { AuthSessionResponse } from '@/lib/auth/types';

export interface LoginInput {
  email: string;
  password: string;
  tenantSlug?: string;
}

export async function login(input: LoginInput): Promise<AuthSessionResponse> {
  const session = await fetchApi<AuthSessionResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    false,
  );

  setAccessToken(session.accessToken);
  if (session.refreshToken) {
    await saveRefreshToken(session.refreshToken);
  }
  return session;
}

export async function refreshSession(): Promise<AuthSessionResponse | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const session = await fetchApi<AuthSessionResponse>(
      '/api/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      false,
    );

    setAccessToken(session.accessToken);
    if (session.refreshToken) {
      await saveRefreshToken(session.refreshToken);
    }
    return session;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    // L'API exige le refreshToken dans le body pour le révoquer
    if (refreshToken) {
      await fetchApi('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // Ignorer les erreurs réseau au logout
  }
  setAccessToken(null);
  await deleteRefreshToken();
  await deleteTenantSlug();
}
