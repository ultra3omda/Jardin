import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_ONBOARDING_KEY = 'allowDuringOnboarding';

/**
 * Marks a controller/handler as reachable by a SCHOOL_ADMIN whose organization
 * is still `PENDING_ONBOARDING`. Used for the endpoints the blocking wizard
 * itself needs (onboarding completion, branding, auth) — see {@link OnboardingGuard}.
 */
export const AllowDuringOnboarding = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_DURING_ONBOARDING_KEY, true);
