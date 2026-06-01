import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/store';

/**
 * Liste des comptes parents du tenant — alimente le picker « Parent/tuteur »
 * lors de la création/édition d'un élève (admin). Miroir de
 * apps/web/lib/api/staff.ts → listParents.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ParentOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface ListParentsResponse {
  items: ParentOption[];
  total: number;
}

async function authed<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let body: { message?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* noop */
    }
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function useParents(enabled = true) {
  return useQuery({
    queryKey: ['parents', 'options'],
    queryFn: () => authed<ListParentsResponse>('/api/parents'),
    enabled,
  });
}
