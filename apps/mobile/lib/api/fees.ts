import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * G2 — Référentiel de frais (admin). Impayés (échéances non réglées) + relance.
 * Miroir de apps/api/src/billing/billing.controller.ts (routes /api/billing/unpaid).
 */
export interface UnpaidInstallment {
  installmentId: string;
  studentId: string;
  studentName: string;
  feeName: string;
  label: string;
  dueDate: string;
  amount: number;
  overdue: boolean;
}

export interface RemindUnpaidResult {
  sent: number;
}

export const FEES_KEYS = {
  unpaid: ['billing', 'unpaid'] as const,
};

/**
 * Endpoint admin-only (SCHOOL_ADMIN). On passe le rôle pour ne fetcher que
 * quand c'est autorisé — évite le 403 pour les autres personas.
 */
export function useUnpaid(role: string | undefined) {
  return useQuery({
    queryKey: FEES_KEYS.unpaid,
    queryFn: () => fetchApi<UnpaidInstallment[]>('/api/billing/unpaid'),
    enabled: role === 'SCHOOL_ADMIN',
    staleTime: 30_000,
  });
}

export function useRemindUnpaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (installmentIds: string[]) =>
      fetchApi<RemindUnpaidResult>('/api/billing/unpaid/remind', {
        method: 'POST',
        body: JSON.stringify({ installmentIds }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: FEES_KEYS.unpaid });
    },
  });
}

export function formatAmount(amount: number, currency = 'TND'): string {
  return `${amount.toFixed(3)} ${currency}`;
}

export function formatDueDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
