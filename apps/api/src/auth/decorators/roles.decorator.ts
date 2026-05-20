import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts an endpoint to the listed roles. Combined with RolesGuard
 * (registered globally). Example: `@Roles(UserRole.SCHOOL_ADMIN)`.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
