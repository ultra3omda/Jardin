import { z } from 'zod';

export const OUTCOMES = ['RETURNED_TO_CLASS', 'SENT_HOME', 'REFERRED', 'EMERGENCY'] as const;

export const healthRecordSchema = z.object({
  studentId: z.string().min(1, 'Élève requis'),
  bloodType: z.string().max(8).optional(),
  allergies: z.string().max(2000).optional(),
  chronicConditions: z.string().max(2000).optional(),
  medications: z.string().max(2000).optional(),
  dietaryRestrictions: z.string().max(2000).optional(),
  doctorName: z.string().max(160).optional(),
  doctorPhone: z.string().max(40).optional(),
  emergencyContactName: z.string().max(160).optional(),
  emergencyContactPhone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});
export type HealthRecordValues = z.infer<typeof healthRecordSchema>;

export const infirmaryVisitSchema = z.object({
  studentId: z.string().min(1, 'Élève requis'),
  visitedAt: z.string().min(1, 'Date et heure requises'),
  reason: z.string().min(1, 'Motif requis').max(2000),
  treatment: z.string().max(2000).optional(),
  temperature: z.coerce.number().min(30).max(45).optional(),
  outcome: z.enum(OUTCOMES).optional(),
});
export type InfirmaryVisitValues = z.infer<typeof infirmaryVisitSchema>;

export const vaccinationSchema = z.object({
  studentId: z.string().min(1, 'Élève requis'),
  vaccineName: z.string().min(1, 'Nom du vaccin requis').max(120),
  administeredAt: z.string().min(1, 'Date requise'),
  nextDueAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});
export type VaccinationValues = z.infer<typeof vaccinationSchema>;
