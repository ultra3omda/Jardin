import { z } from 'zod';

export const MOODS = ['HAPPY', 'CALM', 'TIRED', 'UPSET', 'SICK'] as const;

export const createDailyLogSchema = z.object({
  studentId: z.string().min(1, 'Élève requis'),
  date: z.string().min(1, 'Date requise'),
  meals: z.string().max(200).optional(),
  nap: z.string().max(200).optional(),
  mood: z.enum(MOODS).optional(),
  bathroom: z.string().max(200).optional(),
  activitiesNote: z.string().max(2000).optional(),
  generalNote: z.string().max(2000).optional(),
});
export type CreateDailyLogValues = z.infer<typeof createDailyLogSchema>;
