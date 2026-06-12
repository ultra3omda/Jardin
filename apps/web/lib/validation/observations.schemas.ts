import { z } from 'zod';

export const OBSERVATION_CATEGORIES = [
  'LANGAGE',
  'MOTRICITE',
  'SOCIAL',
  'AUTONOMIE',
  'COGNITIF',
  'ARTISTIQUE',
  'AUTRE',
] as const;

const baseFields = {
  category: z.enum(OBSERVATION_CATEGORIES),
  title: z.string().trim().min(1, 'Titre requis').max(160),
  content: z.string().trim().min(1, 'Contenu requis').max(4000),
  observedAt: z.string().trim().min(1, 'Date requise'),
  visibleToParent: z.boolean().optional(),
};

export const createObservationSchema = z.object({
  studentId: z.string().trim().min(1, 'Élève requis'),
  ...baseFields,
});
export type CreateObservationValues = z.infer<typeof createObservationSchema>;

export const bulkObservationSchema = z.object({
  classId: z.string().trim().min(1, 'Classe requise'),
  studentIds: z.array(z.string().min(1)).min(1, 'Sélectionnez au moins un élève'),
  ...baseFields,
});
export type BulkObservationValues = z.infer<typeof bulkObservationSchema>;
