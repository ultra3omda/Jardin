import { createId } from '@paralleldrive/cuid2';
import { MealRegime, RouteStatus, TransportDirection, UserRole } from '@prisma/client';
import { z } from 'zod';

import type { ImportEntityDef } from '../import-types';

const ADMIN_STAFF = [UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF];

/** Resolve a student by "Prénom Nom" within the tenant. Throws if not unique. */
async function resolveStudentByName(
  tx: { student: { findMany: (args: unknown) => Promise<{ id: string }[]> } },
  tenantId: string,
  fullName: string,
): Promise<string> {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) throw new Error(`Nom d'élève invalide : "${fullName}" (Prénom Nom attendu).`);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  const matches = await tx.student.findMany({
    where: { tenantId, firstName, lastName, deletedAt: null },
    select: { id: true },
  } as never);
  if (matches.length === 0) throw new Error(`Élève introuvable : "${fullName}".`);
  if (matches.length > 1) throw new Error(`Plusieurs élèves nommés "${fullName}" — import ambigu.`);
  return matches[0].id;
}

// ── Meal plans (cantine: régime + allergies par élève) ───────────────────────
const mealRow = z.object({
  student: z.string().min(1).max(160),
  regime: z.enum([
    MealRegime.STANDARD,
    MealRegime.VEGETARIAN,
    MealRegime.HALAL,
    MealRegime.NO_PORK,
    MealRegime.OTHER,
  ]),
  allergies: z.string().max(500).optional().or(z.literal('')),
  active: z.string().optional().or(z.literal('')),
});
type MealRow = z.infer<typeof mealRow>;

export const MEAL_PLANS_ENTITY: ImportEntityDef<MealRow> = {
  id: 'meal-plans',
  label: 'Cantine (régimes & allergies)',
  roles: ADMIN_STAFF,
  columns: [
    { key: 'student', label: 'Élève', required: true, example: 'Lina Ben Ali', hint: 'Prénom Nom (élève existant)' },
    { key: 'regime', label: 'Régime', required: true, example: 'STANDARD', hint: 'STANDARD, VEGETARIAN, HALAL, NO_PORK, OTHER' },
    { key: 'allergies', label: 'Allergies', required: false, example: 'Arachides, lactose' },
    { key: 'active', label: 'Actif', required: false, example: 'oui', hint: 'oui/non (défaut oui)' },
  ],
  rowSchema: mealRow,
  async insert(rows, { tenantId, tx }) {
    let imported = 0;
    for (const r of rows) {
      const studentId = await resolveStudentByName(tx as never, tenantId, r.student);
      const active = !/^(non|no|false|0)$/i.test((r.active ?? '').trim());
      const existing = await tx.mealPlan.findFirst({ where: { tenantId, studentId } });
      if (existing) {
        await tx.mealPlan.update({
          where: { id: existing.id },
          data: { regime: r.regime, allergies: r.allergies || null, active },
        });
      } else {
        await tx.mealPlan.create({
          data: { id: createId(), tenantId, studentId, regime: r.regime, allergies: r.allergies || null, active },
        });
      }
      imported += 1;
    }
    return imported;
  },
};

// ── Bus routes ───────────────────────────────────────────────────────────────
const routeRow = z.object({
  name: z.string().min(1).max(120),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  returnTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM').optional().or(z.literal('')),
  driverName: z.string().max(160).optional().or(z.literal('')),
  driverPhone: z.string().max(40).optional().or(z.literal('')),
  vehiclePlate: z.string().max(20).optional().or(z.literal('')),
  capacity: z.coerce.number().int().min(1).max(200).optional(),
});
type RouteRow = z.infer<typeof routeRow>;

export const BUS_ROUTES_ENTITY: ImportEntityDef<RouteRow> = {
  id: 'bus-routes',
  label: 'Lignes de bus',
  roles: ADMIN_STAFF,
  columns: [
    { key: 'name', label: 'Nom', required: true, example: 'Ligne A - Nord' },
    { key: 'departureTime', label: 'Départ', required: true, example: '07:30', hint: 'HH:MM' },
    { key: 'returnTime', label: 'Retour', required: false, example: '16:30', hint: 'HH:MM' },
    { key: 'driverName', label: 'Chauffeur', required: false, example: 'M. Gharbi' },
    { key: 'driverPhone', label: 'Téléphone', required: false, example: '+216 20 123 456' },
    { key: 'vehiclePlate', label: 'Plaque', required: false, example: '123 TN 4567' },
    { key: 'capacity', label: 'Capacité', required: false, example: '30' },
  ],
  rowSchema: routeRow,
  async insert(rows, { tenantId, tx }) {
    let imported = 0;
    for (const r of rows) {
      const exists = await tx.busRoute.findFirst({ where: { tenantId, name: r.name.trim(), deletedAt: null } });
      if (exists) continue;
      await tx.busRoute.create({
        data: {
          id: createId(),
          tenantId,
          name: r.name.trim(),
          departureTime: r.departureTime,
          returnTime: r.returnTime || null,
          driverName: r.driverName || null,
          driverPhone: r.driverPhone || null,
          vehiclePlate: r.vehiclePlate || null,
          capacity: r.capacity ?? null,
          status: RouteStatus.ACTIVE,
        },
      });
      imported += 1;
    }
    return imported;
  },
};

// ── Transport assignments (élève → ligne) ────────────────────────────────────
const transportRow = z.object({
  student: z.string().min(1).max(160),
  route: z.string().min(1).max(120),
  direction: z
    .enum([TransportDirection.MORNING, TransportDirection.EVENING, TransportDirection.BOTH])
    .optional(),
});
type TransportRow = z.infer<typeof transportRow>;

export const TRANSPORT_ASSIGNMENTS_ENTITY: ImportEntityDef<TransportRow> = {
  id: 'transport-assignments',
  label: 'Affectations transport',
  roles: ADMIN_STAFF,
  columns: [
    { key: 'student', label: 'Élève', required: true, example: 'Lina Ben Ali', hint: 'Prénom Nom' },
    { key: 'route', label: 'Ligne', required: true, example: 'Ligne A - Nord', hint: 'Nom exact d’une ligne existante' },
    { key: 'direction', label: 'Sens', required: false, example: 'BOTH', hint: 'MORNING, EVENING, BOTH (défaut BOTH)' },
  ],
  rowSchema: transportRow,
  async insert(rows, { tenantId, tx }) {
    let imported = 0;
    for (const r of rows) {
      const studentId = await resolveStudentByName(tx as never, tenantId, r.student);
      const route = await tx.busRoute.findFirst({
        where: { tenantId, name: r.route.trim(), deletedAt: null },
        select: { id: true },
      });
      if (!route) throw new Error(`Ligne introuvable : "${r.route}".`);
      const direction = r.direction ?? TransportDirection.BOTH;
      const existing = await tx.transportAssignment.findFirst({
        where: { tenantId, studentId, routeId: route.id, direction },
      });
      if (existing) continue;
      await tx.transportAssignment.create({
        data: { id: createId(), tenantId, studentId, routeId: route.id, direction },
      });
      imported += 1;
    }
    return imported;
  },
};
