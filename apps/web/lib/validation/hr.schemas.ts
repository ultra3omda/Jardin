import { z } from 'zod';

export const CONTRACT_TYPES = ['CDI', 'CDD', 'VACATAIRE', 'TEMPS_PARTIEL'] as const;
export const CONTRACT_STATUSES = ['ACTIVE', 'ENDED'] as const;

export const staffSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
});
export type StaffValues = z.infer<typeof staffSchema>;

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
