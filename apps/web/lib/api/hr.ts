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

// ─── Leave requests (T2c V2) ─────────────────────────────────────────────────
export type LeaveType = 'PAID' | 'SICK' | 'UNPAID' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  reviewNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ListLeavesResponse {
  items: LeaveRequest[];
  total: number;
}
export interface LeaveBalance {
  userId: string;
  year: number;
  allowanceDays: number;
  takenDays: number;
  remainingDays: number;
}
export interface CreateLeaveInput {
  userId?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}
export interface ReviewLeaveInput {
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}

const LEAVES = '/api/hr/leaves';
export const listLeaves = (token: string) => apiGet<ListLeavesResponse>(LEAVES, token);
export const getLeaveBalance = (token: string) => apiGet<LeaveBalance>(`${LEAVES}/balance`, token);
export const createLeave = (token: string, input: CreateLeaveInput) =>
  apiPost<LeaveRequest>(LEAVES, token, input);
export const reviewLeave = (token: string, id: string, input: ReviewLeaveInput) =>
  apiPost<LeaveRequest>(`${LEAVES}/${id}/review`, token, input);
export const deleteLeave = (token: string, id: string) => apiDelete(`${LEAVES}/${id}`, token);

// ─── Payslips (T2c V3) ────────────────────────────────────────────────────────
export type PayslipStatus = 'DRAFT' | 'ISSUED';
export type PayslipComponentKind = 'EARNING' | 'DEDUCTION';

export interface PayslipComponent {
  id: string;
  label: string;
  kind: PayslipComponentKind;
  amount: string; // Decimal string (TND)
}
export interface Payslip {
  id: string;
  userId: string;
  period: string;
  baseSalary: string;
  grossSalary: string;
  totalDeductions: string;
  netSalary: string;
  currency: string;
  status: PayslipStatus;
  issuedAt: string | null;
  notes: string | null;
  components: PayslipComponent[];
  createdAt: string;
  updatedAt: string;
}
export interface ListPayslipsResponse {
  items: Payslip[];
  total: number;
}
export interface GeneratePayslipInput {
  userId: string;
  period: string;
  notes?: string;
}
export interface AddPayslipComponentInput {
  label: string;
  kind: PayslipComponentKind;
  amount: number;
}

const PAYSLIPS = '/api/hr/payslips';
export const listPayslips = (token: string) => apiGet<ListPayslipsResponse>(PAYSLIPS, token);
export const getPayslip = (token: string, id: string) =>
  apiGet<Payslip>(`${PAYSLIPS}/${id}`, token);
export const generatePayslip = (token: string, input: GeneratePayslipInput) =>
  apiPost<Payslip>(PAYSLIPS, token, input);
export const addPayslipComponent = (token: string, id: string, input: AddPayslipComponentInput) =>
  apiPost<Payslip>(`${PAYSLIPS}/${id}/components`, token, input);
export const deletePayslipComponent = (token: string, id: string, componentId: string) =>
  apiDelete<Payslip>(`${PAYSLIPS}/${id}/components/${componentId}`, token);
export const issuePayslip = (token: string, id: string) =>
  apiPost<Payslip>(`${PAYSLIPS}/${id}/issue`, token, {});
export const deletePayslip = (token: string, id: string) => apiDelete(`${PAYSLIPS}/${id}`, token);
