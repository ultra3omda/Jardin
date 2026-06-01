import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * Périodes de notation (trimestres / semestres). Lecture admin/teacher/staff.
 * Miroir de apps/api/src/grade-periods/grade-periods.controller.ts.
 */
export interface GradePeriod {
  id: string;
  name: string;
  schoolYear: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

interface ListGradePeriodsResponse {
  items: GradePeriod[];
  total: number;
}

export function useGradePeriods() {
  return useQuery({
    queryKey: ['grade-periods'] as const,
    queryFn: () => fetchApi<ListGradePeriodsResponse>('/api/grade-periods'),
  });
}
