import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type ContractType = 'CDI' | 'CDD' | 'VACATAIRE' | 'TEMPS_PARTIEL';
export type ContractStatus = 'ACTIVE' | 'ENDED';

export interface EmploymentContract {
  id: string;
  userId: string;
  type: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate: string | null;
  baseSalary: string; // Decimal string (TND)
  currency: string;
  weeklyHours: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ListContractsResponse {
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
export type UpdateContractInput = Partial<Omit<CreateContractInput, 'userId'>> & {
  status?: ContractStatus;
};

const CONTRACTS = '/api/hr/contracts';
export const listContracts = (token: string) => apiGet<ListContractsResponse>(CONTRACTS, token);
export const createContract = (token: string, input: CreateContractInput) =>
  apiPost<EmploymentContract>(CONTRACTS, token, input);
export const updateContract = (token: string, id: string, input: UpdateContractInput) =>
  apiPatch<EmploymentContract>(`${CONTRACTS}/${id}`, token, input);
export const endContract = (token: string, id: string) =>
  apiPost<EmploymentContract>(`${CONTRACTS}/${id}/end`, token, {});
export const deleteContract = (token: string, id: string) =>
  apiDelete(`${CONTRACTS}/${id}`, token);
