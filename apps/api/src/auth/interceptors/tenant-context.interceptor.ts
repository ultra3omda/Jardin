import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Observable } from 'rxjs';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Wraps the request handler in `TenantContextService.run` so that any code
 * downstream (services, Prisma extension) sees the current tenant context
 * via AsyncLocalStorage.
 *
 * No-op for unauthenticated requests (no `req.user`).
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(execCtx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = execCtx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) {
      return next.handle();
    }
    return new Observable((subscriber) => {
      this.tenantContext.run(
        {
          tenantId: user.tenantId,
          userId: user.id,
          role: user.role,
          skipTenantFilter: user.role === UserRole.SUPER_ADMIN,
        },
        () => {
          next.handle().subscribe({
            next: (val) => subscriber.next(val),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }
}
