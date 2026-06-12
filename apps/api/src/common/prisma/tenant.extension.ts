import { Prisma, UserRole } from '@prisma/client';

/**
 * Models whose every row carries a `tenantId` and must be tenant-scoped
 * on read by the multi-tenant extension. Keep this list in sync with the
 * Prisma schema — adding a new tenant-scoped model requires adding it here.
 * The `tenant-scoped-models.spec.ts` guard test fails CI if a schema model
 * with a `tenantId` column is neither listed here nor in
 * {@link TENANT_SCOPED_EXCEPTIONS}.
 */
export const TENANT_SCOPED_MODELS = [
  'User',
  'RefreshToken',
  'AuditLog',
  'Student',
  'ParentStudent', // V3-A
  'Conversation', // V3-B
  'Message', // V3-B
  'Class', // V4
  'ClassTeacher', // V4
  'TimeSlot', // V4
  'Subject', // V6
  'GradePeriod', // V6
  'Evaluation', // V6
  'Grade', // V6
  'Bulletin', // V6
  'Homework', // TAF
  'HomeworkSubmission', // TAF
  'Invoice', // V8
  'Notification', // V8
  'Announcement', // V9
  'Attendance', // V9
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
  'TeacherSubject', // affectations: matières enseignées
  'FeeType', // G2 — référentiel de frais
  'FeeAssignment', // G2 — référentiel de frais
  'FeeInstallment', // G2 — référentiel de frais
  'SmsLog', // G2 — historique SMS (transversal)
  'CashRegisterSession', // G1 — caisse
  'CashMovement', // G1 — caisse
  'Supplier', // G1 — fournisseurs
  'Expense', // G1 — dépenses
  'Observation', // G3 — observations
  'ObservationMedia', // G3 — observations
  'Dish', // G4 — cantine catalogue
  'CanteenReservation', // G4 — cantine réservation
] as const;
export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

/**
 * Models that DO carry a `tenantId` column but are deliberately NOT in
 * {@link TENANT_SCOPED_MODELS}. Each entry must have a written reason —
 * the guard test (`tenant-scoped-models.spec.ts`) only tolerates these.
 *
 * - `Contract`: platform/commercial domain. COMMERCIAL agents create and read
 *   contracts across the organizations they own; auto-injection (and the
 *   COMMERCIAL hard-block) would break that flow. School roles never query
 *   contracts — access is gated by SUPER_ADMIN/COMMERCIAL guards + explicit
 *   `tenantId` filters in `commercial.service.ts`.
 * - `InviteToken`: nullable tenantId, consumed by unauthenticated register
 *   flows (no tenant context) and created by platform roles for any tenant.
 */
export const TENANT_SCOPED_EXCEPTIONS = ['Contract', 'InviteToken'] as const;

/**
 * Tenant-scoped models that ALSO hold platform-level rows (`tenantId = null`):
 * COMMERCIAL agents are Users with no tenant, their sessions are RefreshTokens
 * with no tenant, and platform actions write AuditLogs. For these models the
 * COMMERCIAL hard-block is replaced by pinning reads to `tenantId: null`, so a
 * COMMERCIAL can manage platform rows but can never see a school's users,
 * sessions or audit trail.
 */
export const PLATFORM_SHARED_MODELS = ['User', 'RefreshToken', 'AuditLog'] as const;

function isPlatformShared(model: string | undefined): boolean {
  return !!model && (PLATFORM_SHARED_MODELS as readonly string[]).includes(model);
}

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
 * Maximum number of rows a single list query may return when issued inside a
 * regular tenant request context. Internal/system queries (no tenant context)
 * and SUPER_ADMIN platform ops are exempt — see `clampTake`.
 */
export const MAX_PAGE_SIZE = 1000;

/** Caps a requested page size to {@link MAX_PAGE_SIZE}. Pure, unit-tested. */
export function cappedTake(take: number): number {
  return take > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : take;
}

/**
 * Merges `tenantId` into an existing Prisma `where` clause without losing
 * unique-by-id semantics. We wrap both clauses in an explicit AND so that
 * Prisma keeps using its query planner correctly on simple cases.
 */
function injectTenantWhere(
  args: { where?: Record<string, unknown> } | undefined,
  tenantId: string | null,
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
  /** True when the current role is platform-only (COMMERCIAL). */
  const isForbiddenRole = (): boolean => {
    const role = opts.getRole?.() ?? null;
    return role !== null && TENANT_DATA_FORBIDDEN_ROLES.includes(role);
  };

  /**
   * Throws if a platform-only role tries to touch tenant-scoped data.
   * Platform-shared models (User/RefreshToken/AuditLog) are exempt from the
   * hard-block — their reads get pinned to `tenantId: null` in scopeRead.
   */
  const assertRoleAllowed = (model: string | undefined): void => {
    if (opts.shouldSkip() || !isTenantScoped(model)) return;
    if (isForbiddenRole() && !isPlatformShared(model)) {
      const role = opts.getRole?.() ?? null;
      throw new Error(
        `Tenant isolation breach: role ${String(role)} is platform-only and cannot access ` +
          `tenant-scoped model "${String(model)}".`,
      );
    }
  };

  /**
   * Hard ceiling on `take` for list queries made inside a regular tenant
   * request context. Stops a user-controlled page size (e.g. ?pageSize=100000
   * threaded into `take`) from pulling unbounded result sets and exhausting
   * memory. Trusted paths are exempt: SUPER_ADMIN platform ops (shouldSkip)
   * and context-less system queries (seeds, exports, fan-out) — those set
   * their own explicit caps where needed.
   */
  const clampTake = (args: { take?: unknown } | undefined): void => {
    if (opts.shouldSkip() || !args || typeof args.take !== 'number') return;
    if (opts.getTenantId() === null) return; // no tenant context → system query
    args.take = cappedTake(args.take);
  };

  /** Read/bulk-write ops: block forbidden roles, then inject tenantId. */
  const scopeRead = (
    args: { where?: Record<string, unknown> } | undefined,
    model: string | undefined,
  ): void => {
    assertRoleAllowed(model);
    if (opts.shouldSkip() || !isTenantScoped(model) || !args) return;
    if (isForbiddenRole() && isPlatformShared(model)) {
      // COMMERCIAL reads on platform-shared models only ever see platform
      // rows (tenantId IS NULL) — never a school's users/sessions/audit.
      args.where = injectTenantWhere(args, null).where;
      return;
    }
    const tid = opts.getTenantId();
    if (tid !== null) {
      args.where = injectTenantWhere(args, tid).where;
    }
  };

  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async findMany({ args, query, model }) {
          scopeRead(args, model);
          clampTake(args);
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
