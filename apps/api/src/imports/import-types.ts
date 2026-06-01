import type { z } from 'zod';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';

/** A single importable column (template header + help + example value). */
export interface ImportColumn {
  /** Machine key — must match the Zod row schema field. */
  key: string;
  /** Human header written into the template + shown in the UI. */
  label: string;
  /** Whether the column is required. Drives the template "required" note. */
  required: boolean;
  /** Example value written into the template's sample rows. */
  example: string;
  /** Short hint (units, allowed values, format). */
  hint?: string;
}

/** Context handed to an entity's insert routine, inside a transaction. */
export interface ImportInsertContext {
  tenantId: string;
  user: AuthenticatedUser;
  /** Transaction-scoped Prisma client. */
  tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0];
}

/**
 * Definition of one importable entity. Data-driven: adding a module = adding
 * one of these to the registry (no new controller/route).
 */
export interface ImportEntityDef<TRow = Record<string, unknown>> {
  /** URL-safe id, e.g. "students", "parents". */
  id: string;
  /** Human label, e.g. "Élèves". */
  label: string;
  /** Roles allowed to import this entity. */
  roles: string[];
  /** Columns (order = template column order). */
  columns: ImportColumn[];
  /** Zod schema validating ONE raw row (string-keyed). */
  rowSchema: z.ZodType<TRow>;
  /**
   * Insert all validated rows for a tenant inside a transaction. Should be
   * idempotent where reasonable and throw on any unrecoverable row so the whole
   * import rolls back (atomic). Returns the number of rows imported.
   *
   * Declared as a METHOD (not an arrow property) so its parameters are checked
   * bivariantly: the registry can store entities under a common erased row type
   * while each entity keeps its precise TRow internally.
   */
  insert(rows: TRow[], ctx: ImportInsertContext): Promise<number>;
}

export interface ImportRowError {
  row: number; // 1-based data row (excludes header)
  message: string;
}

export interface ImportResult {
  entity: string;
  total: number; // data rows found
  valid: number; // rows that passed validation
  imported: number; // rows actually written (0 on dry-run)
  dryRun: boolean;
  errors: ImportRowError[];
}
