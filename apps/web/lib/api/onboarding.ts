'use client';

import type { TenantBrand } from '@ecole-saas/shared';

import { apiGet, apiPost } from './http';

const BASE = '/api/onboarding';

export interface OnboardingStatus {
  completed: boolean;
  organization: {
    id: string;
    name: string;
    slug: string;
    type: 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED';
    locale: 'fr' | 'en' | 'ar' | 'es';
    status: 'PENDING_ONBOARDING' | 'ACTIVE' | 'SUSPENDED';
  };
  brand: TenantBrand;
}

export interface CompleteOnboardingInput {
  name: string;
  brand?: {
    primaryColor?: string;
    primaryHover?: string;
    secondaryColor?: string;
    emailHeaderColor?: string;
    logoUrl?: string;
  };
}

export function getOnboardingStatus(token: string): Promise<OnboardingStatus> {
  return apiGet<OnboardingStatus>(`${BASE}/status`, token);
}

export function completeOnboarding(
  token: string,
  input: CompleteOnboardingInput,
): Promise<OnboardingStatus> {
  return apiPost<OnboardingStatus>(`${BASE}/complete`, token, input);
}
