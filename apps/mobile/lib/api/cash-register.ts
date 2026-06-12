import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * G1 — Caisse (admin/staff). Caisse du jour : session ouverte + clôture.
 * Miroir de apps/api/src/cash-register/cash-register.controller.ts
 * (routes /api/cash-register).
 */
export type MovementKind = 'INCOME' | 'EXPENSE';

export interface CashMovement {
  id: string;
  kind: MovementKind;
  amount: number;
  label: string;
}

export interface CashSession {
  id: string;
  openingFloat: number;
  status: 'OPEN';
  movements: CashMovement[];
  liveExpected: number;
}

export interface CloseSessionResult {
  expectedAmount: number;
  countedAmount: number;
  variance: number;
  status: 'CLOSED';
}

export const CASH_REGISTER_KEYS = {
  current: ['cash-register', 'current'] as const,
};

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'STAFF'];

export function canAccessCashRegister(role: string | undefined): boolean {
  return role !== undefined && ALLOWED_ROLES.includes(role);
}

/**
 * Endpoint admin/staff. On passe le rôle pour ne fetcher que quand c'est
 * autorisé — évite le 403 pour les autres personas. Renvoie `null` quand
 * aucune caisse n'est ouverte.
 */
export function useCurrentSession(role: string | undefined) {
  return useQuery({
    queryKey: CASH_REGISTER_KEYS.current,
    queryFn: () => fetchApi<CashSession | null>('/api/cash-register/current'),
    enabled: canAccessCashRegister(role),
    staleTime: 30_000,
  });
}

export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, countedAmount }: { sessionId: string; countedAmount: number }) =>
      fetchApi<CloseSessionResult>(`/api/cash-register/${sessionId}/close`, {
        method: 'POST',
        body: JSON.stringify({ countedAmount }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CASH_REGISTER_KEYS.current });
    },
  });
}

export function formatAmount(amount: number, currency = 'TND'): string {
  return `${amount.toFixed(3)} ${currency}`;
}

export function sumByKind(movements: CashMovement[], kind: MovementKind): number {
  return movements.reduce((acc, m) => (m.kind === kind ? acc + m.amount : acc), 0);
}
