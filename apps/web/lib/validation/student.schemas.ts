import { z } from 'zod';

/**
 * V2 — Module Élèves : Zod schemas pour formulaires web.
 * Miroir de `CreateStudentDto` côté API (apps/api/src/students/dto/student.dto.ts).
 * 15 champs Complet (Décision D24).
 */
const ISO_ALPHA2 = /^[A-Z]{2}$/;
const ISO_LANG2 = /^[a-z]{2}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const createStudentSchema = z.object({
  // — Identité —
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
  dateOfBirth: z.string().regex(ISO_DATE, 'Format YYYY-MM-DD'),
  sex: z.enum(['M', 'F']),
  nationality: z
    .string()
    .regex(ISO_ALPHA2, 'Code ISO 3166-1 alpha-2 (ex: TN)')
    .optional()
    .or(z.literal('')),

  // — Scolarité —
  // Lot 3 — classId = FK (source de vérité). classroom (texte) reste accepté/dérivé.
  classId: z.string().max(40).optional().or(z.literal('')),
  classroom: z.string().max(50).optional().or(z.literal('')),
  enrollmentDate: z.string().regex(ISO_DATE, 'Format YYYY-MM-DD').optional().or(z.literal('')),
  previousSchooling: z.string().max(2000).optional().or(z.literal('')),

  // — Famille —
  parentEmail: z.string().email('Email invalide').max(254),
  siblingsCount: z.coerce.number().int().min(0).max(20).optional(),

  // — Contact —
  addressLine: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  country: z.string().regex(ISO_ALPHA2, 'Code ISO (ex: TN)').optional().or(z.literal('')),

  // — Langue —
  motherTongue: z
    .string()
    .regex(ISO_LANG2, 'Code ISO 639-1 (ex: ar)')
    .optional()
    .or(z.literal('')),

  // — Santé —
  medicalNotes: z.string().max(2000).optional().or(z.literal('')),

  // — Photo (set après upload R2) —
  photoUrl: z.string().url().max(500).optional().or(z.literal('')),
});

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentFormValues = z.infer<typeof createStudentSchema>;
export type UpdateStudentFormValues = z.infer<typeof updateStudentSchema>;
