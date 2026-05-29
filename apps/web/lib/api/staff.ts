import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

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
  tempPassword?: string;
}

export interface ListStaffResponse {
  items: StaffUser[];
  total: number;
}

export interface StaffCreateInput {
  email: string;
  firstName: string;
  lastName: string;
}

export interface StaffEditInput {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

const TEACHERS = '/api/teachers';
const PARENTS = '/api/parents';

export function listTeachers(token: string): Promise<ListStaffResponse> {
  return apiGet<ListStaffResponse>(TEACHERS, token);
}

export function createTeacher(token: string, input: StaffCreateInput): Promise<StaffMutationResult> {
  return apiPost<StaffMutationResult>(TEACHERS, token, input);
}

export function updateTeacher(token: string, id: string, input: StaffEditInput): Promise<StaffUser> {
  return apiPatch<StaffUser>(`${TEACHERS}/${id}`, token, input);
}

export function deleteTeacher(token: string, id: string): Promise<void> {
  return apiDelete(`${TEACHERS}/${id}`, token);
}

export function listParents(token: string): Promise<ListStaffResponse> {
  return apiGet<ListStaffResponse>(PARENTS, token);
}

export function createParent(token: string, input: StaffCreateInput): Promise<StaffMutationResult> {
  return apiPost<StaffMutationResult>(PARENTS, token, input);
}
