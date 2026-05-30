import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type InfirmaryOutcome = 'RETURNED_TO_CLASS' | 'SENT_HOME' | 'REFERRED' | 'EMERGENCY';

// ─── Health records (1 per student) ───────────────────────────────────────────
export interface HealthRecord {
  id: string;
  studentId: string;
  studentName: string;
  bloodType: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  medications: string | null;
  dietaryRestrictions: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}
export interface ListHealthRecordsResponse {
  items: HealthRecord[];
  total: number;
}
export interface CreateHealthRecordInput {
  studentId: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  medications?: string;
  dietaryRestrictions?: string;
  doctorName?: string;
  doctorPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}
export type UpdateHealthRecordInput = Omit<Partial<CreateHealthRecordInput>, 'studentId'>;

const RECORDS = '/api/health-records';
export const listHealthRecords = (token: string) =>
  apiGet<ListHealthRecordsResponse>(RECORDS, token);
export const createHealthRecord = (token: string, input: CreateHealthRecordInput) =>
  apiPost<HealthRecord>(RECORDS, token, input);
export const updateHealthRecord = (token: string, id: string, input: UpdateHealthRecordInput) =>
  apiPatch<HealthRecord>(`${RECORDS}/${id}`, token, input);
export const deleteHealthRecord = (token: string, id: string) =>
  apiDelete(`${RECORDS}/${id}`, token);

// ─── Infirmary visits ─────────────────────────────────────────────────────────
export interface InfirmaryVisit {
  id: string;
  studentId: string;
  studentName: string;
  visitedAt: string;
  reason: string;
  treatment: string | null;
  temperature: number | null;
  outcome: InfirmaryOutcome;
  recordedById: string;
  createdAt: string;
  updatedAt: string;
}
export interface ListInfirmaryVisitsResponse {
  items: InfirmaryVisit[];
  total: number;
}
export interface CreateInfirmaryVisitInput {
  studentId: string;
  visitedAt: string;
  reason: string;
  treatment?: string;
  temperature?: number;
  outcome?: InfirmaryOutcome;
}
export type UpdateInfirmaryVisitInput = Omit<Partial<CreateInfirmaryVisitInput>, 'studentId'>;

const VISITS = '/api/infirmary-visits';
export const listInfirmaryVisits = (token: string) =>
  apiGet<ListInfirmaryVisitsResponse>(VISITS, token);
export const createInfirmaryVisit = (token: string, input: CreateInfirmaryVisitInput) =>
  apiPost<InfirmaryVisit>(VISITS, token, input);
export const updateInfirmaryVisit = (token: string, id: string, input: UpdateInfirmaryVisitInput) =>
  apiPatch<InfirmaryVisit>(`${VISITS}/${id}`, token, input);
export const deleteInfirmaryVisit = (token: string, id: string) =>
  apiDelete(`${VISITS}/${id}`, token);

// ─── Vaccinations ─────────────────────────────────────────────────────────────
export interface Vaccination {
  id: string;
  studentId: string;
  studentName: string;
  vaccineName: string;
  administeredAt: string;
  nextDueAt: string | null;
  notes: string | null;
  recordedById: string;
  createdAt: string;
  updatedAt: string;
}
export interface ListVaccinationsResponse {
  items: Vaccination[];
  total: number;
}
export interface CreateVaccinationInput {
  studentId: string;
  vaccineName: string;
  administeredAt: string;
  nextDueAt?: string;
  notes?: string;
}
export type UpdateVaccinationInput = Omit<Partial<CreateVaccinationInput>, 'studentId'>;

const VACCINATIONS = '/api/vaccinations';
export const listVaccinations = (token: string) =>
  apiGet<ListVaccinationsResponse>(VACCINATIONS, token);
export const createVaccination = (token: string, input: CreateVaccinationInput) =>
  apiPost<Vaccination>(VACCINATIONS, token, input);
export const updateVaccination = (token: string, id: string, input: UpdateVaccinationInput) =>
  apiPatch<Vaccination>(`${VACCINATIONS}/${id}`, token, input);
export const deleteVaccination = (token: string, id: string) =>
  apiDelete(`${VACCINATIONS}/${id}`, token);
