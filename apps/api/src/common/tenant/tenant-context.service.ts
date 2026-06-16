import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { Prisma, UserRole } from '@prisma/client';

/**
 * Per-request tenant context, propagated through async calls via
 * AsyncLocalStorage so any code path (controllers, services, Prisma
 * extension) can read who the current user is and which tenant they're
 * scoped to — without having to thread it through every function signature.
 */
export interface TenantContext {
  /** Tenant ID the request is scoped to. Null for SUPER_ADMIN cross-tenant ops. */
  tenantId: string | null;
  /** Authenticated user ID. */
  userId: string;
  /** Role of the authenticated user. */
  role: UserRole;
  /**
   * If true, the Prisma tenant extension will NOT inject `where.tenantId`.
   * Reserved for SUPER_ADMIN platform-wide operations. Defaults to false.
   */
  skipTenantFilter: boolean;
  /**
   * R1.1 (RLS) — request-scoped Prisma transaction client. When
   * `RLS_SESSION_ENABLED` is on, `TenantContextInterceptor` opens one
   * transaction per request, sets `app.current_tenant` on it, and stores it
   * here; `PrismaService` then routes the request's queries to it so the
   * Postgres RLS session variable is in scope. Undefined when the flag is off
   * or outside an HTTP request (system/seed/migration paths).
   */
  rlsTx?: Prisma.TransactionClient;
}

@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantContext>();

  /**
   * Runs the given callback inside a tenant context. The context is
   * accessible via {@link get} from anywhere in the async chain.
   */
  run<T>(ctx: TenantContext, callback: () => T): T {
    return this.als.run(ctx, callback);
  }

  /** Returns the current context, or undefined if running outside one. */
  get(): TenantContext | undefined {
    return this.als.getStore();
  }

  /** Returns the current tenantId, or null if missing or in bypass mode. */
  getTenantId(): string | null {
    return this.als.getStore()?.tenantId ?? null;
  }

  /** Returns whether the current context bypasses tenant filtering. */
  shouldSkipTenantFilter(): boolean {
    return this.als.getStore()?.skipTenantFilter ?? false;
  }

  /**
   * R1.1 (RLS) — run fire-and-forget background work (e.g. notification
   * fan-out) DETACHED from the current request's transaction. It keeps the
   * tenant identity (tenantId/role/userId) but drops `rlsTx`, so its queries go
   * to the normal pooled client instead of the request transaction — which has
   * already committed by the time the background work runs (otherwise: P2028
   * "transaction already closed"). Errors are swallowed (callers log their own).
   *
   * Deferred to a microtask so it never adds latency to the triggering request.
   */
  runDetached(work: () => Promise<unknown>): void {
    const current = this.als.getStore();
    const run =
      current === undefined
        ? work
        : () => this.als.run({ ...current, rlsTx: undefined }, work);
    void Promise.resolve()
      .then(run)
      .catch(() => undefined);
  }
}
