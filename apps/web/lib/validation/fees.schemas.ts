import { z } from 'zod';

export const FEE_CATEGORIES = ['STANDARD', 'DIVERS', 'OPTIONNEL'] as const;
export const FEE_RECURRENCES = ['ONCE', 'MONTHLY', 'TERM', 'YEARLY'] as const;

const SCHOOL_YEAR_PATTERN = /^\d{4}-\d{4}$/;

export const createFeeTypeSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  category: z.enum(FEE_CATEGORIES),
  defaultAmount: z.coerce
    .number({ invalid_type_error: 'Montant invalide' })
    .min(0, 'Le montant doit être positif'),
  recurrence: z.enum(FEE_RECURRENCES),
  level: z.string().trim().max(60).optional(),
  schoolYear: z
    .string()
    .trim()
    .regex(SCHOOL_YEAR_PATTERN, 'Format attendu : AAAA-AAAA (ex. 2025-2026)'),
});
export type CreateFeeTypeValues = z.infer<typeof createFeeTypeSchema>;

export const bulkAssignSchema = z
  .object({
    feeTypeId: z.string().min(1, 'Frais requis'),
    target: z.enum(['class', 'level']),
    classId: z.string().optional(),
    level: z.string().trim().max(60).optional(),
    schoolYear: z
      .string()
      .trim()
      .regex(SCHOOL_YEAR_PATTERN, 'Format attendu : AAAA-AAAA (ex. 2025-2026)'),
    installments: z.coerce
      .number({ invalid_type_error: 'Nombre invalide' })
      .int('Nombre entier requis')
      .min(1, 'Au moins 1 échéance')
      .max(12, 'Maximum 12 échéances'),
    amount: z.coerce.number().min(0).optional(),
    advanceAmount: z.coerce.number().min(0).optional(),
  })
  .refine((v) => (v.target === 'class' ? !!v.classId : true), {
    message: 'Sélectionnez une classe',
    path: ['classId'],
  })
  .refine((v) => (v.target === 'level' ? !!v.level?.trim() : true), {
    message: 'Indiquez un niveau',
    path: ['level'],
  });
export type BulkAssignValues = z.infer<typeof bulkAssignSchema>;
