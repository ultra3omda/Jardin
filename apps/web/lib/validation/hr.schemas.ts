import { z } from 'zod';

export const CONTRACT_TYPES = ['CDI', 'CDD', 'VACATAIRE', 'TEMPS_PARTIEL'] as const;
export const CONTRACT_STATUSES = ['ACTIVE', 'ENDED'] as const;

export const employmentContractSchema = z.object({
  userId: z.string().min(1, 'Employé requis'),
  type: z.enum(CONTRACT_TYPES),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().optional(),
  baseSalary: z.coerce.number().min(0, 'Salaire invalide').max(9_999_999),
  weeklyHours: z.coerce.number().int().min(1).max(80).optional(),
  notes: z.string().max(2000).optional(),
});
export type EmploymentContractValues = z.infer<typeof employmentContractSchema>;

// ─── Leaves (T2c V2) ──────────────────────────────────────────────────────────
export const LEAVE_TYPES = ['PAID', 'SICK', 'UNPAID', 'OTHER'] as const;

export const leaveRequestSchema = z
  .object({
    type: z.enum(LEAVE_TYPES),
    startDate: z.string().min(1, 'Date de début requise'),
    endDate: z.string().min(1, 'Date de fin requise'),
    reason: z.string().max(2000).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'La date de fin doit être postérieure ou égale au début',
    path: ['endDate'],
  });
export type LeaveRequestValues = z.infer<typeof leaveRequestSchema>;
