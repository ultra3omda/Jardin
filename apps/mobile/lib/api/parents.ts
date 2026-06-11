import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/store';

/**
 * Liste des comptes parents du tenant — alimente le picker « Parent/tuteur »
 * lors de la création/édition d'un élève (admin). Miroir de
 * apps/web/lib/api/staff.ts → listParents / createParent.
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

export interface CreateParentInput {
  firstName: string;
  lastName: string;
  email: string;
  /** Required by the mobile form (optional at the API layer). */
  phone: string;
}

/** Mirror of the API's StaffUserResponseDto — tempPassword is shown ONCE. */
export interface CreatedParent extends ParentOption {
  phone?: string | null;
  tempPassword?: string;
}

const PARENTS_KEY = ['parents', 'options'] as const;

async function authed<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string>),
    },
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
    queryKey: PARENTS_KEY,
    queryFn: () => authed<ListParentsResponse>('/api/parents'),
    enabled,
  });
}

/**
 * Create a parent account (SCHOOL_ADMIN). The API mints a temp password
 * returned once in the response — surface it to the admin so they can hand
 * it to the parent. Invalidates the parents list so pickers refresh.
 */
export function useCreateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateParentInput) =>
      authed<CreatedParent>('/api/parents', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PARENTS_KEY });
    },
  });
}
