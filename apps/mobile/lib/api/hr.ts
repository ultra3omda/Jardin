import { fetchApi } from './client';

/**
 * RH — contrats de travail (SCHOOL_ADMIN). 1er incrément du module RH mobile.
 * Miroir de apps/api/src/hr/contracts.controller.ts (routes /api/hr/contracts).
 */
export type ContractType = 'CDI' | 'CDD' | 'VACATAIRE' | 'TEMPS_PARTIEL';
export type ContractStatus = 'ACTIVE' | 'ENDED';

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  VACATAIRE: 'Vacataire',
  TEMPS_PARTIEL: 'Temps partiel',
};

export const CONTRACT_TYPE_OPTIONS = (Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map(
  (value) => ({ value, label: CONTRACT_TYPE_LABELS[value] }),
);

export interface EmploymentContract {
  id: string;
  userId: string;
  type: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate?: string | null;
  baseSalary: string;
  currency: string;
  weeklyHours?: number | null;
  notes?: string | null;
  createdAt: string;
}

interface ListContractsResponse {
  items: EmploymentContract[];
  total: number;
}

export interface CreateContractInput {
  userId: string;
  type: ContractType;
  startDate: string;
  endDate?: string;
  baseSalary: number;
  weeklyHours?: number;
  notes?: string;
}

export const HR_CONTRACTS_KEY = ['hr', 'contracts'] as const;

export function listContracts(): Promise<ListContractsResponse> {
  return fetchApi<ListContractsResponse>('/api/hr/contracts');
}

export function createContract(input: CreateContractInput): Promise<EmploymentContract> {
  return fetchApi<EmploymentContract>('/api/hr/contracts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function endContract(id: string): Promise<EmploymentContract> {
  return fetchApi<EmploymentContract>(`/api/hr/contracts/${id}/end`, { method: 'POST', body: '{}' });
}

export function deleteContract(id: string): Promise<void> {
  return fetchApi<void>(`/api/hr/contracts/${id}`, { method: 'DELETE' });
}
