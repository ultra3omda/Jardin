'use client';

import { apiGet, apiPost } from './http';

const BASE = '/api/commercial';

export type TenantType = 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED';
export type TenantStatus = 'PENDING_ONBOARDING' | 'ACTIVE' | 'SUSPENDED';
export type Locale = 'fr' | 'en' | 'ar' | 'es';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  locale: Locale;
  status: TenantStatus;
  onboardingCompleted: boolean;
  createdAt: string;
  inviteStatus: 'pending' | 'consumed' | 'expired' | null;
  contractsCount: number;
}

export interface CommercialAgent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  type: TenantType;
  locale?: Locale;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  contract: {
    reference?: string;
    fileKey: string;
    fileName: string;
    signedAt: string;
    startDate: string;
    endDate?: string;
    notes?: string;
  };
}

export interface CreateOrganizationResponse {
  organization: OrganizationSummary;
  invite: { id: string; url: string; expiresAt: string };
  inviteEmailSent: boolean;
}

export function listOrganizations(token: string): Promise<OrganizationSummary[]> {
  return apiGet<OrganizationSummary[]>(`${BASE}/organizations`, token);
}

export function createOrganization(
  token: string,
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResponse> {
  return apiPost<CreateOrganizationResponse>(`${BASE}/organizations`, token, input);
}

export function createContractUploadUrl(
  token: string,
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; fileKey: string }> {
  return apiPost(`${BASE}/contracts/upload-url`, token, { fileName, contentType });
}

export function listAgents(token: string): Promise<CommercialAgent[]> {
  return apiGet<CommercialAgent[]>(`${BASE}/agents`, token);
}

export function createAgent(
  token: string,
  input: { email: string; firstName: string; lastName: string; password: string },
): Promise<CommercialAgent> {
  return apiPost<CommercialAgent>(`${BASE}/agents`, token, input);
}
