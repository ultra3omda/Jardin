import { createId } from '@paralleldrive/cuid2';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import type { ImportEntityDef } from '../import-types';

const ADMIN = [UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN];

// ── Classes ──────────────────────────────────────────────────────────────────
const classRow = z.object({
  name: z.string().min(1).max(60),
  level: z.string().min(1).max(40),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, 'Format AAAA-AAAA (ex. 2025-2026)'),
});
type ClassRow = z.infer<typeof classRow>;

export const CLASSES_ENTITY: ImportEntityDef<ClassRow> = {
  id: 'classes',
  label: 'Classes',
  roles: ADMIN,
  columns: [
    { key: 'name', label: 'Nom', required: true, example: 'CP-A' },
    { key: 'level', label: 'Niveau', required: true, example: 'CP', hint: 'CP, CE1, 6e, PS…' },
    { key: 'schoolYear', label: 'Année scolaire', required: true, example: '2025-2026', hint: 'AAAA-AAAA' },
  ],
  rowSchema: classRow,
  async insert(rows, { tenantId, tx }) {
    let imported = 0;
    for (const r of rows) {
      const exists = await tx.class.findFirst({
        where: { tenantId, name: r.name, schoolYear: r.schoolYear, deletedAt: null },
      });
      if (exists) continue;
      await tx.class.create({
        data: { id: createId(), tenantId, name: r.name.trim(), level: r.level.trim(), schoolYear: r.schoolYear },
      });
      imported += 1;
    }
    return imported;
  },
};

// ── Subjects ─────────────────────────────────────────────────────────────────
const subjectRow = z.object({
  name: z.string().min(1).max(80),
  code: z.string().max(20).optional().or(z.literal('')),
  emoji: z.string().max(8).optional().or(z.literal('')),
  coefficient: z.coerce.number().min(1).max(10).optional(),
  levels: z.string().max(200).optional().or(z.literal('')),
});
type SubjectRow = z.infer<typeof subjectRow>;

export const SUBJECTS_ENTITY: ImportEntityDef<SubjectRow> = {
  id: 'subjects',
  label: 'Matières',
  roles: ADMIN,
  columns: [
    { key: 'name', label: 'Nom', required: true, example: 'Mathématiques' },
    { key: 'code', label: 'Code', required: false, example: 'MATH' },
    { key: 'emoji', label: 'Emoji', required: false, example: '📐' },
    { key: 'coefficient', label: 'Coefficient', required: false, example: '4', hint: 'Entre 1 et 10' },
    {
      key: 'levels',
      label: 'Niveaux',
      required: false,
      example: 'CP;CE1;CE2',
      hint: 'Séparés par ;  (vide = tous niveaux)',
    },
  ],
  rowSchema: subjectRow,
  async insert(rows, { tenantId, tx }) {
    let imported = 0;
    for (const r of rows) {
      const name = r.name.trim();
      const exists = await tx.subject.findFirst({ where: { tenantId, name } });
      if (exists) continue;
      const levels = (r.levels ?? '')
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await tx.subject.create({
        data: {
          id: createId(),
          tenantId,
          name,
          code: r.code?.trim() || null,
          emoji: r.emoji?.trim() || null,
          coefficient: r.coefficient ?? 1,
          levels,
        },
      });
      imported += 1;
    }
    return imported;
  },
};

// ── Grade periods (trimestres) ───────────────────────────────────────────────
const periodRow = z.object({
  name: z.string().min(1).max(40),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, 'Format AAAA-AAAA'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'AAAA-MM-JJ'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'AAAA-MM-JJ'),
});
type PeriodRow = z.infer<typeof periodRow>;

export const GRADE_PERIODS_ENTITY: ImportEntityDef<PeriodRow> = {
  id: 'grade-periods',
  label: 'Trimestres',
  roles: ADMIN,
  columns: [
    { key: 'name', label: 'Nom', required: true, example: 'T1' },
    { key: 'schoolYear', label: 'Année scolaire', required: true, example: '2025-2026', hint: 'AAAA-AAAA' },
    { key: 'startDate', label: 'Début', required: true, example: '2025-09-15', hint: 'AAAA-MM-JJ' },
    { key: 'endDate', label: 'Fin', required: true, example: '2025-12-20', hint: 'AAAA-MM-JJ' },
  ],
  rowSchema: periodRow,
  async insert(rows, { tenantId, tx }) {
    let imported = 0;
    for (const r of rows) {
      const exists = await tx.gradePeriod.findFirst({
        where: { tenantId, name: r.name, schoolYear: r.schoolYear },
      });
      if (exists) continue;
      await tx.gradePeriod.create({
        data: {
          id: createId(),
          tenantId,
          name: r.name.trim(),
          schoolYear: r.schoolYear,
          startDate: new Date(r.startDate),
          endDate: new Date(r.endDate),
        },
      });
      imported += 1;
    }
    return imported;
  },
};
