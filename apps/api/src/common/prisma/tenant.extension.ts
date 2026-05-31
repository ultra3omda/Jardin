import { Prisma } from '@prisma/client';

/**
 * Models whose every row carries a `tenantId` and must be tenant-scoped
 * on read by the multi-tenant extension. Keep this list in sync with the
 * Prisma schema — adding a new tenant-scoped model requires adding it here.
 */
export const TENANT_SCOPED_MODELS = [
  'User',
  'RefreshToken',
  'AuditLog',
  'Student',
  'ParentStudent', // V3-A
  'DailyLogEntry', // T2b
  'Activity', // T2b
  'ActivityParticipation', // T2b
  'DisciplineIncident', // T2b PR-2
  'HealthRecord', // T2b PR-2
  'InfirmaryVisit', // T2b PR-2
  'Vaccination', // T2b PR-2
  'CanteenMenu', // T2b PR-3
  'MealPlan', // T2b PR-3
  'BusRoute', // T2b PR-3
  'BusStop', // T2b PR-3
  'TransportAssignment', // T2b PR-3
  'SecurityIncident', // T2b PR-4
  'VisitorLog', // T2b PR-4
  'SafetyDrill', // T2b PR-4
  'EmploymentContract', // T2c V1
  'LeaveRequest', // T2c V2
] as const;
export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

export function isTenantScoped(model: string | undefined): model is TenantScopedModel {
  return !!model && (TENANT_SCOPED_MODELS as readonly string[]).includes(model);
}

export interface TenantExtensionOptions {
  /** Returns the current tenant ID, or null if running without a tenant. */
  getTenantId: () => string | null;
  /** Returns true when the extension should NOT inject tenantId filters. */
  shouldSkip: () => boolean;
}

/**
 * Merges `tenantId` into an existing Prisma `where` clause without losing
 * unique-by-id semantics. We wrap both clauses in an explicit AND so that
 * Prisma keeps using its query planner correctly on simple cases.
 */
function injectTenantWhere(
  args: { where?: Record<string, unknown> } | undefined,
  tenantId: string,
): { where: Record<string, unknown> } {
  const current = args?.where;
  if (!current || Object.keys(current).length === 0) {
    return { where: { tenantId } };
  }
  if ('tenantId' in current) {
    // Caller already pinned tenantId — don't override, but make sure it
    // matches the context.
    if (current['tenantId'] !== tenantId) {
      throw new Error(
        `Tenant isolation breach: query asked for tenantId=${String(current['tenantId'])} but ` +
          `current context is tenantId=${tenantId}.`,
      );
    }
    return { where: current };
  }
  return { where: { AND: [{ tenantId }, current] } };
}

/**
 * Builds a Prisma client extension that auto-injects `where: { tenantId }`
 * on read and bulk-update/delete queries against tenant-scoped models.
 *
 * Not overridden:
 * - `findUnique` / `findUniqueOrThrow` — would break unique-by-id semantics.
 *   Callers must use `findFirst` for tenant-aware lookups.
 * - `create` / `createMany` / `upsert` — callers must pass `tenantId` explicitly.
 * - `update` / `delete` (single, by unique where) — same reason as findUnique;
 *   callers should use `updateMany` / `deleteMany` for tenant-aware writes,
 *   or pre-check ownership via `findFirst`.
 */
export function createTenantExtension(opts: TenantExtensionOptions) {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async findMany({ args, query, model }) {
          if (!opts.shouldSkip() && isTenantScoped(model)) {
            const tid = opts.getTenantId();
            if (tid !== null) {
              const merged = injectTenantWhere(args, tid);
              args.where = merged.where;
            }
          }
          return query(args);
        },
        async findFirst({ args, query, model }) {
          if (!opts.shouldSkip() && isTenantScoped(model)) {
            const tid = opts.getTenantId();
            if (tid !== null) {
              const merged = injectTenantWhere(args, tid);
              args.where = merged.where;
            }
          }
          return query(args);
        },
        async findFirstOrThrow({ args, query, model }) {
          if (!opts.shouldSkip() && isTenantScoped(model)) {
            const tid = opts.getTenantId();
            if (tid !== null) {
              const merged = injectTenantWhere(args, tid);
              args.where = merged.where;
            }
          }
          return query(args);
        },
        async count({ args, query, model }) {
          if (!opts.shouldSkip() && isTenantScoped(model)) {
            const tid = opts.getTenantId();
            if (tid !== null) {
              const merged = injectTenantWhere(args, tid);
              args.where = merged.where;
            }
          }
          return query(args);
        },
        async aggregate({ args, query, model }) {
          if (!opts.shouldSkip() && isTenantScoped(model)) {
            const tid = opts.getTenantId();
            if (tid !== null) {
              const merged = injectTenantWhere(args, tid);
              args.where = merged.where;
            }
          }
          return query(args);
        },
        async groupBy({ args, query, model }) {
          if (!opts.shouldSkip() && isTenantScoped(model)) {
            const tid = opts.getTenantId();
            if (tid !== null) {
              const merged = injectTenantWhere(args, tid);
              args.where = merged.where;
            }
          }
          return query(args);
        },
        async updateMany({ args, query, model }) {
          if (!opts.shouldSkip() && isTenantScoped(model)) {
            const tid = opts.getTenantId();
            if (tid !== null) {
              const merged = injectTenantWhere(args, tid);
              args.where = merged.where;
            }
          }
          return query(args);
        },
        async deleteMany({ args, query, model }) {
          if (!opts.shouldSkip() && isTenantScoped(model)) {
            const tid = opts.getTenantId();
            if (tid !== null) {
              const merged = injectTenantWhere(args, tid);
              args.where = merged.where;
            }
          }
          return query(args);
        },
      },
    },
  });
}
