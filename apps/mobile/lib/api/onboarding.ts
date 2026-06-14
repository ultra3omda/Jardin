import { fetchApi } from './client';

/**
 * Onboarding bloquant (SCHOOL_ADMIN). Miroir de
 * apps/api/src/onboarding/onboarding.controller.ts (routes /api/onboarding/*).
 * V… : l'onboarding est désormais disponible sur mobile (cf. ADR 0016 amendé).
 */
export interface OnboardingBrandInput {
  primaryColor?: string;
  primaryHover?: string;
  secondaryColor?: string;
  emailHeaderColor?: string;
  logoUrl?: string;
}

export interface CompleteOnboardingInput {
  name: string;
  brand?: OnboardingBrandInput;
}

export interface OnboardingStatus {
  completed: boolean;
  organization: { id: string; name: string; slug: string; status: string };
}

export function getOnboardingStatus(): Promise<OnboardingStatus> {
  return fetchApi<OnboardingStatus>('/api/onboarding/status');
}

export function completeOnboarding(input: CompleteOnboardingInput): Promise<OnboardingStatus> {
  return fetchApi<OnboardingStatus>('/api/onboarding/complete', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
