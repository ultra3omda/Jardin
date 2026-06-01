import { createId } from '@paralleldrive/cuid2';
import { Locale, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { z } from 'zod';

import type { ImportEntityDef } from '../import-types';

const emailRow = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});
type PersonRow = z.infer<typeof emailRow>;

/** Builds a User-account import entity (parent / teacher / staff). */
function peopleEntity(
  id: string,
  label: string,
  role: UserRole,
): ImportEntityDef<PersonRow> {
  return {
    id,
    label,
    roles: [UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN],
    columns: [
      { key: 'firstName', label: 'Prénom', required: true, example: 'Sami' },
      { key: 'lastName', label: 'Nom', required: true, example: 'Ben Ali' },
      {
        key: 'email',
        label: 'Email',
        required: true,
        example: `${id.slice(0, 4)}@exemple.tn`,
        hint: 'Adresse unique. Sert d’identifiant de connexion.',
      },
    ],
    rowSchema: emailRow,
    async insert(rows, { tenantId, tx }) {
      let imported = 0;
      for (const r of rows) {
        const email = r.email.trim().toLowerCase();
        const existing = await tx.user.findFirst({ where: { tenantId, email } });
        if (existing) continue; // idempotent: skip duplicates
        const rand = Math.floor(1000 + Math.random() * 9000);
        const passwordHash = await bcrypt.hash(
          `${r.firstName.toLowerCase().replace(/\s/g, '')}${rand}`,
          12,
        );
        await tx.user.create({
          data: {
            id: createId(),
            tenantId,
            email,
            firstName: r.firstName.trim(),
            lastName: r.lastName.trim(),
            passwordHash,
            role,
            locale: Locale.fr,
          },
        });
        imported += 1;
      }
      return imported;
    },
  };
}

export const PARENTS_ENTITY = peopleEntity('parents', 'Parents', UserRole.PARENT);
export const TEACHERS_ENTITY = peopleEntity('teachers', 'Enseignants', UserRole.TEACHER);
export const STAFF_ENTITY = peopleEntity('staff', 'Personnel', UserRole.STAFF);
