import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * Dossiers de santé élèves (admin / personnel ; parents → leurs enfants).
 * Miroir de apps/api/src/student-health/health-records.controller.ts.
 */
export interface HealthRecord {
  id: string;
  studentId: string;
  studentName: string;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  medications?: string | null;
  doctorName?: string | null;
  doctorPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHealthRecordInput {
  studentId: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  medications?: string;
  doctorName?: string;
  doctorPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

interface ListHealthRecordsResponse {
  items: HealthRecord[];
  total: number;
}

export const HEALTH_RECORDS_KEY = ['health-records'] as const;

function clean<T extends object>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function useHealthRecords() {
  return useQuery({
    queryKey: HEALTH_RECORDS_KEY,
    queryFn: () => fetchApi<ListHealthRecordsResponse>('/api/health-records'),
  });
}

export function createHealthRecord(input: CreateHealthRecordInput): Promise<HealthRecord> {
  return fetchApi<HealthRecord>('/api/health-records', {
    method: 'POST',
    body: JSON.stringify(clean(input)),
  });
}

export function deleteHealthRecord(id: string): Promise<void> {
  return fetchApi<void>(`/api/health-records/${id}`, { method: 'DELETE' });
}
