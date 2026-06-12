import { z } from 'zod';

/**
 * G5 — Rapport d'activité (compte rendu PDF).
 * Validation du formulaire d'édition du rapport d'une activité.
 */
export const activityReportSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(160, '160 caractères maximum'),
  summary: z.string().min(1, 'Résumé requis').max(5000, '5000 caractères maximum'),
  visibleToParent: z.boolean(),
});

export type ActivityReportValues = z.infer<typeof activityReportSchema>;
