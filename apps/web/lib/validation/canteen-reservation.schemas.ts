import { z } from 'zod';

/** G4 — Cantine : validation des formulaires (plats + réservation). */

export const createDishSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(160),
  ingredients: z.array(z.string().trim().min(1)).optional(),
  allergens: z.array(z.string().trim().min(1)).optional(),
});
export type CreateDishValues = z.infer<typeof createDishSchema>;

export const reserveSchema = z.object({
  studentId: z.string().trim().min(1, 'Élève requis'),
  date: z.string().trim().min(1, 'Date requise'),
});
export type ReserveValues = z.infer<typeof reserveSchema>;
