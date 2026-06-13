import { z } from 'zod';

/** G8 — Calendrier scolaire : schéma de validation (création d'événement). */

export const CALENDAR_EVENT_TYPE_VALUES = [
  'VACATION',
  'HOLIDAY',
  'EVENT',
  'EXAM',
  'MEETING',
] as const;

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Titre requis').max(200),
    type: z.enum(CALENDAR_EVENT_TYPE_VALUES, { invalid_type_error: 'Type invalide' }),
    startDate: z.string().trim().min(1, 'Date de début requise'),
    endDate: z.string().trim().min(1, 'Date de fin requise'),
    schoolYear: z.string().trim().min(1, 'Année scolaire requise').max(20),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => new Date(v.endDate).getTime() >= new Date(v.startDate).getTime(), {
    message: 'La date de fin doit être postérieure ou égale à la date de début',
    path: ['endDate'],
  });

export type CreateEventValues = z.infer<typeof createEventSchema>;
