import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Observable, from, lastValueFrom } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantContextService, type TenantContext } from '../../common/tenant/tenant-context.service';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/** R1.1 (RLS) — read once. Off → exact pre-RLS behaviour (no request tx). */
const RLS_SESSION_ENABLED = process.env.RLS_SESSION_ENABLED === 'true';

/**
 * Wraps the request handler in `TenantContextService.run` so that any code
 * downstream (services, Prisma extension) sees the current tenant context
 * via AsyncLocalStorage.
 *
 * R1.1 (RLS): when `RLS_SESSION_ENABLED` is on, it ALSO opens one transaction
 * per request, sets the Postgres session GUCs `app.current_tenant` /
 * `app.bypass_rls` on it, and stores it on the context so `PrismaService`
 * routes the request's queries through it. The GUC scopes Row-Level Security.
 *
 * No-op for unauthenticated requests (no `req.user`).
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  intercept(execCtx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = execCtx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) {
      return next.handle();
    }

    const ctx: TenantContext = {
      tenantId: user.tenantId,
      userId: user.id,
      role: user.role,
      skipTenantFilter: user.role === UserRole.SUPER_ADMIN,
    };

    if (!RLS_SESSION_ENABLED) {
      // Pre-RLS behaviour: just run within the AsyncLocalStorage context.
      return new Observable((subscriber) => {
        this.tenantContext.run(ctx, () => {
          next.handle().subscribe({
            next: (val) => subscriber.next(val),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        });
      });
    }

    // RLS on: open one transaction per request, set the GUCs on it, route the
    // request's queries through it (PrismaService reads ctx.rlsTx). The tx
    // commits when the handler completes and rolls back if it throws.
    return from(
      this.tenantContext.run(ctx, () =>
        this.prisma.$transaction(
          async (tx) => {
            ctx.rlsTx = tx;
            await tx.$queryRawUnsafe(
              `SELECT set_config('app.current_tenant', $1, true), set_config('app.bypass_rls', $2, true)`,
              ctx.tenantId ?? '',
              ctx.skipTenantFilter ? 'on' : 'off',
            );
            return lastValueFrom(next.handle(), { defaultValue: undefined });
          },
          // The whole request now runs in this tx, so the timeout must cover the
          // slowest endpoint (bulk import, PDF, heavy aggregations). Generous on
          // purpose — Prisma's 5s default would break those. maxWait caps how
          // long we'll wait for a pooled connection before failing fast.
          { timeout: 30_000, maxWait: 15_000 },
        ),
      ),
    );
  }
}
