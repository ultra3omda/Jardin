import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

/**
 * The authenticated user as exposed by the JWT strategy. Attached to
 * `req.user` by JwtAuthGuard.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string | null;
  role: UserRole;
}

/**
 * Injects the authenticated user into a controller method parameter.
 * Throws inside the controller if no user is present (caller forgot a guard).
 */
export const CurrentUser = createParamDecorator<unknown, ExecutionContext, AuthenticatedUser>(
  (_data, ctx) => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!req.user) {
      throw new Error(
        'CurrentUser decorator used on an endpoint without an active JWT guard.',
      );
    }
    return req.user;
  },
);
