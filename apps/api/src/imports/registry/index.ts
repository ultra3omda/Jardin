import type { ImportEntityDef } from '../import-types';
import {
  CLASSES_ENTITY,
  GRADE_PERIODS_ENTITY,
  SUBJECTS_ENTITY,
} from './academic.entities';
import { PARENTS_ENTITY, STAFF_ENTITY, TEACHERS_ENTITY } from './people.entities';
import {
  BUS_ROUTES_ENTITY,
  MEAL_PLANS_ENTITY,
  TRANSPORT_ASSIGNMENTS_ENTITY,
} from './school-life.entities';
import { STUDENTS_ENTITY } from './students.entity';

/**
 * The full set of importable entities. Order is the recommended import order
 * (dependencies first: accounts + classes before students; routes before
 * transport assignments). Adding a module = adding one entry here.
 */
export const IMPORT_ENTITIES: ImportEntityDef[] = [
  PARENTS_ENTITY as ImportEntityDef,
  TEACHERS_ENTITY as ImportEntityDef,
  STAFF_ENTITY as ImportEntityDef,
  CLASSES_ENTITY as ImportEntityDef,
  SUBJECTS_ENTITY as ImportEntityDef,
  GRADE_PERIODS_ENTITY as ImportEntityDef,
  STUDENTS_ENTITY as ImportEntityDef,
  MEAL_PLANS_ENTITY as ImportEntityDef,
  BUS_ROUTES_ENTITY as ImportEntityDef,
  TRANSPORT_ASSIGNMENTS_ENTITY as ImportEntityDef,
];

export function getImportEntity(id: string): ImportEntityDef | undefined {
  return IMPORT_ENTITIES.find((e) => e.id === id);
}
