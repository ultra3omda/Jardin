import { createId } from '@paralleldrive/cuid2';
import { RelationType, Sex, UserRole } from '@prisma/client';
import { z } from 'zod';

import type { ImportEntityDef } from '../import-types';

const ISO_ALPHA2 = /^[A-Z]{2}$/;
const ISO_LANG2 = /^[a-z]{2}$/;

const studentRow = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'AAAA-MM-JJ requis'),
  sex: z.enum([Sex.M, Sex.F]),
  classroom: z.string().min(1).max(60),
  parentEmail: z.string().email(),
  relationType: z.enum([RelationType.FATHER, RelationType.MOTHER, RelationType.LEGAL_GUARDIAN, RelationType.OTHER]).optional(),
  nationality: z.string().regex(ISO_ALPHA2).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().regex(ISO_ALPHA2).optional().or(z.literal('')),
  motherTongue: z.string().regex(ISO_LANG2).optional().or(z.literal('')),
  siblingsCount: z.coerce.number().int().min(0).max(20).optional(),
});
type StudentRow = z.infer<typeof studentRow>;

export const STUDENTS_ENTITY: ImportEntityDef<StudentRow> = {
  id: 'students',
  label: 'Élèves',
  roles: [UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN],
  columns: [
    { key: 'firstName', label: 'Prénom', required: true, example: 'Lina' },
    { key: 'lastName', label: 'Nom', required: true, example: 'Ben Ali' },
    { key: 'dateOfBirth', label: 'Date de naissance', required: true, example: '2018-09-15', hint: 'AAAA-MM-JJ' },
    { key: 'sex', label: 'Sexe', required: true, example: 'F', hint: 'M ou F' },
    { key: 'classroom', label: 'Classe', required: true, example: 'CP-A', hint: 'Nom exact d’une classe existante' },
    { key: 'parentEmail', label: 'Email parent', required: true, example: 'parent@exemple.tn', hint: 'Compte parent existant requis' },
    { key: 'relationType', label: 'Lien parent', required: false, example: 'MOTHER', hint: 'FATHER, MOTHER, LEGAL_GUARDIAN, OTHER' },
    { key: 'nationality', label: 'Nationalité', required: false, example: 'TN', hint: 'Code ISO (TN, FR…)' },
    { key: 'city', label: 'Ville', required: false, example: 'Tunis' },
    { key: 'country', label: 'Pays', required: false, example: 'TN', hint: 'Code ISO' },
    { key: 'motherTongue', label: 'Langue maternelle', required: false, example: 'ar', hint: 'Code ISO (ar, fr…)' },
    { key: 'siblingsCount', label: 'Frères/sœurs', required: false, example: '0' },
  ],
  rowSchema: studentRow,
  async insert(rows, { tenantId, tx }) {
    let imported = 0;
    for (const r of rows) {
      const parentEmail = r.parentEmail.trim().toLowerCase();
      // Parent must exist (same rule as single create).
      const parent = await tx.user.findFirst({
        where: { tenantId, email: parentEmail, role: UserRole.PARENT, deletedAt: null },
        select: { id: true },
      });
      if (!parent) {
        throw new Error(`Aucun compte parent pour "${parentEmail}" (créez-le d'abord).`);
      }
      // Class must exist (resolve by name, latest school year).
      const cls = await tx.class.findFirst({
        where: { tenantId, name: r.classroom.trim(), deletedAt: null },
        orderBy: { schoolYear: 'desc' },
        select: { id: true, name: true },
      });
      if (!cls) {
        throw new Error(`Classe introuvable : "${r.classroom}".`);
      }
      const studentId = createId();
      await tx.student.create({
        data: {
          id: studentId,
          tenantId,
          firstName: r.firstName.trim(),
          lastName: r.lastName.trim(),
          dateOfBirth: new Date(r.dateOfBirth),
          sex: r.sex,
          classroom: cls.name,
          classId: cls.id,
          enrollmentDate: new Date(),
          parentEmail,
          siblingsCount: r.siblingsCount ?? 0,
          nationality: r.nationality || null,
          city: r.city || null,
          country: r.country || 'TN',
          motherTongue: r.motherTongue || null,
        },
      });
      await tx.parentStudent.create({
        data: {
          id: createId(),
          tenantId,
          parentUserId: parent.id,
          studentId,
          relationType: r.relationType ?? RelationType.MOTHER,
          isPrimaryContact: true,
        },
      });
      imported += 1;
    }
    return imported;
  },
};
