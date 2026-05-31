import { z } from 'zod';

export const REGIMES = ['STANDARD', 'VEGETARIAN', 'HALAL', 'NO_PORK', 'OTHER'] as const;

export const canteenMenuSchema = z.object({
  date: z.string().min(1, 'Date requise'),
  starter: z.string().max(200).optional(),
  main: z.string().max(200).optional(),
  dessert: z.string().max(200).optional(),
  vegetarian: z.string().max(200).optional(),
});
export type CanteenMenuValues = z.infer<typeof canteenMenuSchema>;

export const mealPlanSchema = z.object({
  studentId: z.string().min(1, 'Élève requis'),
  regime: z.enum(REGIMES).optional(),
  allergies: z.string().max(2000).optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});
export type MealPlanValues = z.infer<typeof mealPlanSchema>;
