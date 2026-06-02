import { z } from 'zod';

export const CATEGORIES = ['ART', 'MUSIC', 'SPORT', 'OUTING', 'OTHER'] as const;

export const activitySchema = z.object({
  name: z.string().min(1, 'Nom requis').max(160),
  description: z.string().max(2000).optional(),
  category: z.enum(CATEGORIES).optional(),
  scheduledAt: z.string().optional(),
  durationMin: z.coerce.number().int().min(1).max(1440).optional(),
  location: z.string().max(160).optional(),
  responsibleUserId: z.string().max(40).optional(),
  classId: z.string().max(40).optional(),
});
export type ActivityValues = z.infer<typeof activitySchema>;
