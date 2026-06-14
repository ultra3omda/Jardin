import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchApi } from './client';
import { useAuthStore } from '@/lib/auth/store';

/**
 * Pipeline commercial (rôle COMMERCIAL / SUPER_ADMIN). Miroir mobile de
 * apps/web/lib/api/commercial.ts → apps/api/src/commercial/commercial.controller.ts.
 *
 * Le COMMERCIAL n'a pas de tenant : il enregistre les établissements qu'il a
 * signés, suit leur onboarding et invite leur admin. Le téléversement du PDF de
 * contrat (presigned R2 PUT) est web-only ; sur natif la création se fait sans
 * contrat (rattachable plus tard côté web).
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export type TenantType = 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED';
export type TenantStatus = 'PENDING_ONBOARDING' | 'ACTIVE' | 'SUSPENDED';
export type Locale = 'fr' | 'en' | 'ar' | 'es';
export type InviteStatus = 'pending' | 'consumed' | 'expired';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  locale: Locale;
  status: TenantStatus;
  onboardingCompleted: boolean;
  createdAt: string;
  inviteStatus: InviteStatus | null;
  contractsCount: number;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  type: TenantType;
  locale?: Locale;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  sendInviteEmail?: boolean;
}

export interface CreateOrganizationResponse {
  organization: OrganizationSummary;
  invite: { id: string; url: string; expiresAt: string };
  inviteEmailSent: boolean;
}

export interface PipelineSummary {
  total: number;
  pending: number;
  active: number;
  suspended: number;
  contracts: number;
}

export const ORGANIZATIONS_KEY = ['commercial', 'organizations'] as const;
export const organizationKey = (id: string) => ['commercial', 'organization', id] as const;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

/**
 * Aggregate the org list into pipeline KPIs for the commercial dashboard.
 * Pure — no I/O — so it can be unit-tested without the network.
 */
export function summarizePipeline(orgs: OrganizationSummary[]): PipelineSummary {
  return orgs.reduce<PipelineSummary>(
    (acc, o) => ({
      total: acc.total + 1,
      pending: acc.pending + (o.status === 'PENDING_ONBOARDING' ? 1 : 0),
      active: acc.active + (o.status === 'ACTIVE' ? 1 : 0),
      suspended: acc.suspended + (o.status === 'SUSPENDED' ? 1 : 0),
      contracts: acc.contracts + o.contractsCount,
    }),
    { total: 0, pending: 0, active: 0, suspended: 0, contracts: 0 },
  );
}

// ---------------------------------------------------------------------------
// Queries & mutations
// ---------------------------------------------------------------------------

export function useOrganizations() {
  return useQuery({
    queryKey: ORGANIZATIONS_KEY,
    queryFn: () => fetchApi<OrganizationSummary[]>('/api/commercial/organizations'),
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: organizationKey(id),
    queryFn: () => fetchApi<OrganizationSummary>(`/api/commercial/organizations/${encodeURIComponent(id)}`),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrganizationInput) =>
      fetchApi<CreateOrganizationResponse>('/api/commercial/organizations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
    },
  });
}

export const canDownloadContract = Platform.OS === 'web';

/**
 * Web-only : récupère l'URL signée du dernier contrat (PDF privé R2) puis ouvre
 * le PDF dans un nouvel onglet. Natif différé (cohérent avec le reste du
 * mobile : pas d'écriture fichier locale pour l'instant).
 */
export async function openContractPdf(id: string): Promise<void> {
  if (Platform.OS !== 'web') return;
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(
    `${API_BASE}/api/commercial/organizations/${encodeURIComponent(id)}/contract`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) throw new Error(`Contrat indisponible (${res.status})`);
  const { url } = (await res.json()) as { url: string; fileName: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w: any = globalThis;
  w.open(url, '_blank', 'noopener,noreferrer');
}
