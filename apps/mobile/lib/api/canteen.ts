import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * G4 — Cantine (réservation de repas). Lecture + réservation/annulation parent.
 * Miroir de apps/api/src/canteen/canteen-extra.controller.ts
 * (routes /api/canteen/reservations).
 *
 * Côté PARENT, le serveur scope la liste à ses enfants ; la réservation et
 * l'annulation sont contrôlées par appartenance (un parent ne touche que ses
 * propres enfants, et ne peut qu'annuler — pas SERVED).
 */
export type ReservationStatus = 'RESERVED' | 'CANCELLED' | 'SERVED';

export interface CanteenReservation {
  id: string;
  studentId: string;
  /** Date ISO renvoyée par l'API (jour du repas). */
  date: string;
  status: ReservationStatus;
}

export interface ReserveInput {
  studentId: string;
  /** Date du repas au format YYYY-MM-DD. */
  date: string;
}

export interface ReservationsFilter {
  studentId: string;
  /** Borne basse incluse (YYYY-MM-DD) — filtrage client de la fenêtre 7 jours. */
  from: string;
  /** Borne haute incluse (YYYY-MM-DD). */
  to: string;
}

export const CANTEEN_KEYS = {
  reservations: (studentId: string) => ['canteen', 'reservations', studentId] as const,
};

/** Normalise une date ISO/Date en clé jour YYYY-MM-DD. */
export function toDateKey(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    return typeof value === 'string' ? value.slice(0, 10) : '';
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Réservations d'un enfant sur la fenêtre [from, to]. Activé uniquement quand un
 * enfant est sélectionné. Le serveur scope déjà le parent à ses enfants ; on
 * filtre côté client sur la fenêtre de jours affichée.
 */
export function useReservations(filter: ReservationsFilter | null) {
  return useQuery({
    queryKey: filter
      ? CANTEEN_KEYS.reservations(filter.studentId)
      : ['canteen', 'reservations', 'none'],
    queryFn: () =>
      fetchApi<CanteenReservation[]>(
        `/api/canteen/reservations?studentId=${encodeURIComponent(filter!.studentId)}`,
      ),
    enabled: filter !== null,
    staleTime: 30_000,
    select: (rows) => {
      if (!filter) return rows;
      return rows.filter((r) => {
        const key = toDateKey(r.date);
        return key >= filter.from && key <= filter.to;
      });
    },
  });
}

/** Réserve (idempotent) un repas pour un enfant à une date donnée. */
export function useReserve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReserveInput) =>
      fetchApi<CanteenReservation>('/api/canteen/reservations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: CANTEEN_KEYS.reservations(res.studentId) });
    },
  });
}

/** Annule une réservation existante (PATCH status=CANCELLED). */
export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; studentId: string }) =>
      fetchApi<CanteenReservation>(`/api/canteen/reservations/${vars.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: CANTEEN_KEYS.reservations(vars.studentId) });
    },
  });
}
