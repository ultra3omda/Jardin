import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * Lot 4 — Annuaire (admin). Enseignants / parents / personnel.
 * Miroir de apps/api/src/users/staff.controller.ts.
 */
export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface StaffMutationResult extends StaffUser {
  /** Mot de passe temporaire renvoyé à la création (à transmettre au compte). */
  tempPassword?: string;
}

export interface StaffCreateInput {
  email: string;
  firstName: string;
  lastName: string;
}

interface ListStaffResponse {
  items: StaffUser[];
  total: number;
}

export type DirectoryKind = 'teachers' | 'parents' | 'staff';

const PATH: Record<DirectoryKind, string> = {
  teachers: '/api/users/teachers',
  parents: '/api/users/parents',
  staff: '/api/users/staff',
};

export const DIRECTORY_KEY = (kind: DirectoryKind) => ['directory', kind] as const;

export function useDirectory(kind: DirectoryKind) {
  return useQuery({
    queryKey: DIRECTORY_KEY(kind),
    queryFn: () => fetchApi<ListStaffResponse>(PATH[kind]),
  });
}

export function createDirectoryUser(
  kind: DirectoryKind,
  input: StaffCreateInput,
): Promise<StaffMutationResult> {
  return fetchApi<StaffMutationResult>(PATH[kind], {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Parents have no delete endpoint; teachers & staff do. */
export function deleteDirectoryUser(kind: 'teachers' | 'staff', id: string): Promise<void> {
  return fetchApi<void>(`${PATH[kind]}/${id}`, { method: 'DELETE' });
}
