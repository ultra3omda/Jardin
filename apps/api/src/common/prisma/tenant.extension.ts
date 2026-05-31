import { Prisma, UserRole } from '@prisma/client';

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
  'Payslip', // T2c V3
  'PayslipComponent', // T2c V3
  'TenantSubscription', // GTM payments
  'PaymentTransaction', // GTM payments
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
  /**
   * Returns the role of the current authenticated user, or null when running
   * outside an authenticated context (e.g. login lookups, system tasks).
   * Used to hard-block platform-only roles (COMMERCIAL) from ever touching
   * tenant-scoped data, even if an endpoint forgot its @Roles guard.
   */
  getRole?: () => UserRole | null;
}

/**
 * Platform-only roles that must NEVER read or write tenant-scoped data.
 * SUPER_ADMIN is intentionally cross-tenant (it sets `skipTenantFilter`), so it
 * is NOT listed here — it is allowed to bypass on purpose. COMMERCIAL, on the
 * other hand, only manages organizations + contracts and must be denied any
 * access to a school's actual data.
 */
const TENANT_DATA_FORBIDDEN_ROLES: readonly UserRole[] = [UserRole.COMMERCIAL];

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
 * Builds a Prisma client extension that:
 *  1. hard-blocks platform-only roles (COMMERCIAL) from any tenant-scoped op;
 *  2. auto-injects `where: { tenantId }` on read and bulk-update/delete queries
 *     against tenant-scoped models.
 *
 * Not tenant-injected (callers stay responsible):
 * - `findUnique` / `findUniqueOrThrow` — would break unique-by-id semantics.
 *   Callers must use `findFirst` for tenant-aware lookups.
 * - `create` / `createMany` / `upsert` — callers must pass `tenantId` explicitly.
 * - `update` / `delete` (single, by unique where) — same reason as findUnique;
 *   callers should use `updateMany` / `deleteMany` for tenant-aware writes,
 *   or pre-check ownership via `findFirst`.
 *
 * The COMMERCIAL hard-block applies to ALL of the above (reads + writes).
 */
export function createTenantExtension(opts: TenantExtensionOptions) {
  /** Throws if a platform-only role tries to touch tenant-scoped data. */
  const assertRoleAllowed = (model: string | undefined): void => {
    if (opts.shouldSkip() || !isTenantScoped(model)) return;
    const role = opts.getRole?.() ?? null;
    if (role !== null && TENANT_DATA_FORBIDDEN_ROLES.includes(role)) {
      throw new Error(
        `Tenant isolation breach: role ${role} is platform-only and cannot access ` +
          `tenant-scoped model "${String(model)}".`,
      );
    }
  };

  /** Read/bulk-write ops: block forbidden roles, then inject tenantId. */
  const scopeRead = (
    args: { where?: Record<string, unknown> } | undefined,
    model: string | undefined,
  ): void => {
    assertRoleAllowed(model);
    if (!opts.shouldSkip() && isTenantScoped(model)) {
      const tid = opts.getTenantId();
      if (tid !== null && args) {
        args.where = injectTenantWhere(args, tid).where;
      }
    }
  };

  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async findMany({ args, query, model }) {
          scopeRead(args, model);
          return query(args);
        },
        async findFirst({ args, query, model }) {
          scopeRead(args, model);
          return query(args);
        },
        async findFirstOrThrow({ args, query, model }) {
          scopeRead(args, model);
          return query(args);
        },
        async findUnique({ args, query, model }) {
          assertRoleAllowed(model);
          return query(args);
        },
        async findUniqueOrThrow({ args, query, model }) {
          assertRoleAllowed(model);
          return query(args);
        },
        async count({ args, query, model }) {
          scopeRead(args, model);
          return query(args);
        },
        async aggregate({ args, query, model }) {
          scopeRead(args, model);
          return query(args);
        },
        async groupBy({ args, query, model }) {
          scopeRead(args, model);
          return query(args);
        },
        async updateMany({ args, query, model }) {
          scopeRead(args, model);
          return query(args);
        },
        async deleteMany({ args, query, model }) {
          scopeRead(args, model);
          return query(args);
        },
        async create({ args, query, model }) {
          assertRoleAllowed(model);
          return query(args);
        },
        async createMany({ args, query, model }) {
          assertRoleAllowed(model);
          return query(args);
        },
        async upsert({ args, query, model }) {
          assertRoleAllowed(model);
          return query(args);
        },
        async update({ args, query, model }) {
          assertRoleAllowed(model);
          return query(args);
        },
        async delete({ args, query, model }) {
          assertRoleAllowed(model);
          return query(args);
        },
      },
    },
  });
}
