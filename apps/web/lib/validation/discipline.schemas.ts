import { z } from 'zod';

export const SEVERITIES = ['MINOR', 'MAJOR', 'SUSPENSION'] as const;

export const disciplineSchema = z.object({
  studentId: z.string().min(1, 'Élève requis'),
  classId: z.string().optional(),
  type: z.enum(SEVERITIES),
  occurredAt: z.string().min(1, 'Date requise'),
  description: z.string().min(1, 'Description requise').max(5000),
  sanction: z.string().max(500).optional(),
});
export type DisciplineValues = z.infer<typeof disciplineSchema>;
