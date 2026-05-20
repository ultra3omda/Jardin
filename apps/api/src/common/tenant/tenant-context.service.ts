import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

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
}
