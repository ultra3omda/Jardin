import type { AuthTenant, AuthUser } from './types';

/**
 * GTM — un SCHOOL_ADMIN dont l'organisation n'a pas terminé l'onboarding doit
 * passer par l'assistant avant d'accéder à l'app. Les autres rôles et les orgs
 * déjà onboardées passent. `onboardingCompleted` absent (ancienne session) ⇒
 * on ne bloque pas (fail-open : évite de verrouiller un admin si le champ
 * manque).
 */
export function needsOnboarding(user: AuthUser | null, tenant: AuthTenant | null): boolean {
  if (!user || user.role !== 'SCHOOL_ADMIN') return false;
  if (!tenant) return false;
  return tenant.onboardingCompleted === false;
}
