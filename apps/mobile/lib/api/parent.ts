import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';
import type { Invoice } from './billing';

/**
 * Lot démo parent — sources de données scopées aux enfants du parent connecté.
 *  - GET /students/my-children
 *  - GET /billing/my-invoices  (lecture seule)
 */
export interface MyChild {
  id: string;
  firstName: string;
  lastName: string;
  classId: string | null;
  className: string | null;
  classLevel: string | null;
  photoUrl: string | null;
}

export const PARENT_KEYS = {
  children: ['parent', 'children'] as const,
  invoices: ['parent', 'invoices'] as const,
};

export function useMyChildren() {
  return useQuery({
    queryKey: PARENT_KEYS.children,
    queryFn: () => fetchApi<MyChild[]>('/api/students/my-children'),
  });
}

export function useMyInvoices() {
  return useQuery({
    queryKey: PARENT_KEYS.invoices,
    queryFn: () => fetchApi<{ items: Invoice[]; total: number }>('/api/billing/my-invoices'),
  });
}
