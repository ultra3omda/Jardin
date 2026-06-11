import { ApiError, fetchApi, setAccessToken } from './client';
import { saveRefreshToken } from '@/lib/auth/secure-storage';
import type { AuthSessionResponse } from '@/lib/auth/types';

export type DemoPersona =
  | 'admin-primary'
  | 'admin-kindergarten'
  | 'teacher-primary'
  | 'teacher-kindergarten'
  | 'parent-primary'
  | 'parent-kindergarten'
  | 'staff'
  | 'staff-kindergarten'
  | 'super-admin';

/**
 * V7-B — Auto-login a demo persona via the same NestJS endpoint web uses.
 * Returns the same AuthSessionResponse shape as login(), and persists the
 * refresh token in expo-secure-store + sets the in-memory access token,
 * matching the side-effects of login() so useAuthStore.setSession() Just Works.
 */
export async function demoLogin(persona: DemoPersona): Promise<AuthSessionResponse> {
  try {
    const session = await fetchApi<AuthSessionResponse>(
      '/api/auth/demo-login',
      {
        method: 'POST',
        body: JSON.stringify({ persona }),
      },
      false,
    );

    setAccessToken(session.accessToken);
    if (session.refreshToken) {
      await saveRefreshToken(session.refreshToken);
    }
    return session;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, 'Demo login failed');
  }
}
