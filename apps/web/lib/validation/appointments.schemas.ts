import { z } from 'zod';

/** G6 — Rendez-vous parents : schémas de validation (création type + créneau). */

export const MIN_SLOT_DURATION_MIN = 5;
export const MAX_SLOT_DURATION_MIN = 240;

export const createTypeSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  durationMin: z
    .number({ invalid_type_error: 'Durée requise' })
    .int('Durée invalide')
    .min(MIN_SLOT_DURATION_MIN, `Minimum ${MIN_SLOT_DURATION_MIN} minutes`)
    .max(MAX_SLOT_DURATION_MIN, `Maximum ${MAX_SLOT_DURATION_MIN} minutes`),
});
export type CreateTypeValues = z.infer<typeof createTypeSchema>;

export const createSlotSchema = z
  .object({
    staffUserId: z.string().trim().min(1, 'Membre requis'),
    startsAt: z.string().trim().min(1, 'Début requis'),
    endsAt: z.string().trim().min(1, 'Fin requise'),
  })
  .refine((v) => new Date(v.endsAt).getTime() > new Date(v.startsAt).getTime(), {
    message: 'La fin doit être après le début',
    path: ['endsAt'],
  });
export type CreateSlotValues = z.infer<typeof createSlotSchema>;
