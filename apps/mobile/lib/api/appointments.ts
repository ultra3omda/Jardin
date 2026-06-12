import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * G6 — Rendez-vous parents. Réservation de créneaux par les parents + gestion
 * (confirmation / annulation) par staff/admin/enseignant. Miroir de
 * apps/api/src/appointments/appointments.controller.ts (routes /api/appointments).
 *
 * Le serveur scope tout au tenant ; `/mine` est scopé au parent connecté et
 * `/` (liste staff) est réservé à SCHOOL_ADMIN/STAFF/TEACHER. On gate les hooks
 * via `enabled` selon le rôle pour éviter les 403 inutiles.
 */
export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface AppointmentType {
  id: string;
  name: string;
  durationMin: number;
}

export interface AppointmentSlot {
  id: string;
  staffUserId: string;
  /** Date ISO de début du créneau. */
  startsAt: string;
  /** Date ISO de fin du créneau. */
  endsAt: string;
}

/** Slot embarqué dans un rendez-vous (sous-ensemble utilisé côté UI). */
export interface AppointmentSlotRef {
  startsAt: string;
  endsAt: string;
}

export interface Appointment {
  id: string;
  status: AppointmentStatus;
  typeId: string;
  studentId: string | null;
  note: string | null;
  slot: AppointmentSlotRef;
}

export interface BookAppointmentInput {
  slotId: string;
  typeId: string;
  studentId?: string;
  note?: string;
}

export const APPOINTMENTS_KEYS = {
  types: ['appointments', 'types'] as const,
  slots: ['appointments', 'slots'] as const,
  mine: ['appointments', 'mine'] as const,
  staff: ['appointments', 'staff'] as const,
};

const STAFF_ROLES = ['SCHOOL_ADMIN', 'STAFF', 'TEACHER'];

export function canManageAppointments(role: string | undefined): boolean {
  return role !== undefined && STAFF_ROLES.includes(role);
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  REQUESTED: 'En attente',
  CONFIRMED: 'Confirmé',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
  NO_SHOW: 'Absent',
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  REQUESTED: '#f08d00',
  CONFIRMED: '#16a34a',
  CANCELLED: '#ef4444',
  COMPLETED: '#475569',
  NO_SHOW: '#cc2606',
};

export function appointmentStatusLabel(status: AppointmentStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function appointmentStatusColor(status: AppointmentStatus): string {
  return STATUS_COLORS[status] ?? '#475569';
}

/** Formate un créneau « lun. 16 juin · 14:00 – 14:30 ». */
export function formatSlotRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime())) return startsAt;
  const day = start.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  });
  const startTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const endTime = Number.isNaN(end.getTime())
    ? ''
    : end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return endTime ? `${day} · ${startTime} – ${endTime}` : `${day} · ${startTime}`;
}

// ─── Lecture (types & créneaux) ───────────────────────────────────────────────

/** Types de rendez-vous actifs du tenant. Tout rôle authentifié. */
export function useAppointmentTypes(role: string | undefined) {
  return useQuery({
    queryKey: APPOINTMENTS_KEYS.types,
    queryFn: () => fetchApi<AppointmentType[]>('/api/appointments/types'),
    enabled: role !== undefined,
    staleTime: 60_000,
  });
}

/** Créneaux futurs disponibles (non réservés). Tout rôle authentifié. */
export function useAvailableSlots(role: string | undefined) {
  return useQuery({
    queryKey: APPOINTMENTS_KEYS.slots,
    queryFn: () => fetchApi<AppointmentSlot[]>('/api/appointments/slots'),
    enabled: role !== undefined,
    staleTime: 30_000,
  });
}

// ─── Parent ───────────────────────────────────────────────────────────────────

/**
 * Réserve un créneau (POST, réservé au parent). En cas de 409 le créneau a été
 * pris entre-temps — l'appelant rafraîchit la liste et affiche un message.
 */
export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BookAppointmentInput) =>
      fetchApi<Appointment>('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.slots });
      void qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.mine });
    },
  });
}

/** Rendez-vous du parent connecté (scopé serveur). */
export function useMyAppointments(role: string | undefined) {
  return useQuery({
    queryKey: APPOINTMENTS_KEYS.mine,
    queryFn: () => fetchApi<Appointment[]>('/api/appointments/mine'),
    enabled: role === 'PARENT',
    staleTime: 30_000,
  });
}

// ─── Staff / Admin ────────────────────────────────────────────────────────────

/** Liste des rendez-vous du tenant (admin/staff/enseignant). */
export function useStaffAppointments(role: string | undefined) {
  return useQuery({
    queryKey: APPOINTMENTS_KEYS.staff,
    queryFn: () => fetchApi<Appointment[]>('/api/appointments'),
    enabled: canManageAppointments(role),
    staleTime: 30_000,
  });
}

/** Met à jour le statut d'un rendez-vous (admin/staff/enseignant). */
export function useSetAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: AppointmentStatus }) =>
      fetchApi<Appointment>(`/api/appointments/${vars.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: vars.status }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.staff });
      void qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.slots });
    },
  });
}
