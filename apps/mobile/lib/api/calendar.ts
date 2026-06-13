import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * G8 — Calendrier scolaire (vacances, jours fériés, événements, examens,
 * réunions). Lecture pour tout rôle authentifié. Miroir de
 * apps/api/src/calendar/calendar.controller.ts (routes /api/calendar).
 *
 * Le GET est public à tous les rôles côté serveur ; le client le consomme tel
 * quel (read-only côté parent).
 */
export type CalendarEventType = 'VACATION' | 'HOLIDAY' | 'EVENT' | 'EXAM' | 'MEETING';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  schoolYear: string;
  notes: string | null;
}

export const CALENDAR_KEYS = {
  all: ['calendar'] as const,
  byYear: (schoolYear: string) => ['calendar', schoolYear] as const,
};

const TYPE_LABELS: Record<CalendarEventType, string> = {
  VACATION: 'Vacances',
  HOLIDAY: 'Jour férié',
  EVENT: 'Événement',
  EXAM: 'Examen',
  MEETING: 'Réunion',
};

const TYPE_COLORS: Record<CalendarEventType, string> = {
  VACATION: '#02a896',
  HOLIDAY: '#ff4318',
  EVENT: '#f08d00',
  EXAM: '#671bf0',
  MEETING: '#3b82f6',
};

export function calendarTypeLabel(type: CalendarEventType): string {
  return TYPE_LABELS[type] ?? type;
}

export function calendarTypeColor(type: CalendarEventType): string {
  return TYPE_COLORS[type] ?? '#475569';
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Plage de dates lisible. Si début == fin (même jour), affiche un seul jour ;
 * sinon « du … au … ».
 */
export function formatEventRange(startDate: string, endDate: string): string {
  const start = formatDay(startDate);
  const end = formatDay(endDate);
  if (start === end) return start;
  return `Du ${start} au ${end}`;
}

/**
 * Calendrier scolaire. Activé pour tout rôle authentifié. Le paramètre
 * schoolYear est optionnel : sans lui, le serveur renvoie l'année courante.
 */
export function useCalendar(role: string | undefined, schoolYear?: string) {
  const query = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: schoolYear ? CALENDAR_KEYS.byYear(schoolYear) : CALENDAR_KEYS.all,
    queryFn: () => fetchApi<CalendarEvent[]>(`/api/calendar${query}`),
    enabled: role !== undefined,
    staleTime: 60_000,
  });
}
