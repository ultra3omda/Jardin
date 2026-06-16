import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContextService } from '../tenant/tenant-context.service';
import { createTenantExtension } from './tenant.extension';

/**
 * Properties that must always resolve on the raw client / service instance,
 * never on the tenant-guarded extended client (lifecycle + Nest hooks).
 */
const RAW_CLIENT_PROPS = new Set<string | symbol>([
  'onModuleInit',
  'onModuleDestroy',
  '$connect',
  '$disconnect',
  '$on',
  'logger',
]);

/**
 * The Prisma client every service injects.
 *
 * Every query goes through the tenant-isolation extension
 * ({@link createTenantExtension}): inside an authenticated request context
 * (AsyncLocalStorage, set by `TenantContextInterceptor`), reads and bulk
 * writes on tenant-scoped models are automatically pinned to the caller's
 * `tenantId`, and platform-only roles (COMMERCIAL) are blocked from school
 * data. Outside a context (login lookups, seeds, system jobs) queries run
 * unscoped — callers stay responsible, as before.
 *
 * Wiring: the constructor returns a Proxy that routes the query surface
 * (model delegates, `$transaction`, `$queryRaw`, …) to the extended client
 * and keeps lifecycle methods on the raw client. This makes the guard a
 * single choke point — no service can bypass it by injecting PrismaService,
 * because PrismaService IS the guarded client.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(tenantContext: TenantContextService) {
    super();
    const guarded = this.$extends(
      createTenantExtension({
        getTenantId: () => tenantContext.getTenantId(),
        shouldSkip: () => tenantContext.shouldSkipTenantFilter(),
        getRole: () => tenantContext.get()?.role ?? null,
      }),
    ) as unknown as Record<string | symbol, unknown>;

    // R1.1 (RLS) — read once at construction. When OFF (default everywhere
    // except the CI test job and, later, opted-in prod), the routing branch
    // below is skipped entirely and the Proxy behaves byte-for-byte as before.
    const rlsSessionEnabled = process.env.RLS_SESSION_ENABLED === 'true';

    return new Proxy(this, {
      get: (target, prop) => {
        if (RAW_CLIENT_PROPS.has(prop) || typeof prop === 'symbol') {
          return Reflect.get(target, prop);
        }
        // When a request-scoped RLS transaction is active (HTTP request + flag
        // on), route the query surface to it so the `app.current_tenant` GUC
        // set on that transaction is in scope. The interceptor's own
        // `$transaction` that OPENS this tx still falls through (rlsTx is unset
        // at that point). Service-level `$transaction` calls join the ambient
        // request tx rather than opening a separate (GUC-less) one.
        if (rlsSessionEnabled) {
          const ctxTx = tenantContext.get()?.rlsTx;
          if (ctxTx) {
            if (prop === '$transaction') {
              return (arg: unknown) =>
                Array.isArray(arg)
                  ? Promise.all(arg as Array<Promise<unknown>>)
                  : (arg as (client: Prisma.TransactionClient) => unknown)(ctxTx);
            }
            const txValue = (ctxTx as unknown as Record<string | symbol, unknown>)[prop];
            if (txValue !== undefined) {
              return typeof txValue === 'function'
                ? (txValue as (...a: unknown[]) => unknown).bind(ctxTx)
                : txValue;
            }
          }
        }
        const guardedValue = guarded[prop];
        if (guardedValue === undefined) {
          return Reflect.get(target, prop);
        }
        // Bind client methods ($transaction, $queryRaw, …) to the guarded
        // client. Without this, `prisma.$transaction(cb)` would run with
        // `this` = the proxy and hand the callback an UNextended `tx`, so
        // queries inside interactive transactions would bypass the tenant
        // guard. Model delegates are plain objects and pass through as-is.
        return typeof guardedValue === 'function' ? guardedValue.bind(guarded) : guardedValue;
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected (tenant isolation extension active)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
