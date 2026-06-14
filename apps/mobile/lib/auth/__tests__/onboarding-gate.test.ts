import { needsOnboarding } from '../onboarding-gate';
import type { AuthTenant, AuthUser } from '../types';

const admin = { role: 'SCHOOL_ADMIN' } as AuthUser;
const tenant = (onboardingCompleted?: boolean): AuthTenant =>
  ({ id: 't', name: 'X', slug: 'x', type: 'PRIMARY_SCHOOL', locale: 'fr', timezone: 'tz', brand: null, onboardingCompleted }) as AuthTenant;

describe('needsOnboarding', () => {
  it('gates a SCHOOL_ADMIN whose org has not completed onboarding', () => {
    expect(needsOnboarding(admin, tenant(false))).toBe(true);
  });

  it('lets through once onboarding is completed', () => {
    expect(needsOnboarding(admin, tenant(true))).toBe(false);
  });

  it('does not gate non-admin roles', () => {
    expect(needsOnboarding({ role: 'TEACHER' } as AuthUser, tenant(false))).toBe(false);
  });

  it('does not gate when there is no tenant (e.g. SUPER_ADMIN)', () => {
    expect(needsOnboarding(admin, null)).toBe(false);
  });

  it('fail-open when the flag is absent (legacy session)', () => {
    expect(needsOnboarding(admin, tenant(undefined))).toBe(false);
  });
});
