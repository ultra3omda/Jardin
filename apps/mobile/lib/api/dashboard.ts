import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

export interface DashboardOverview {
  totalStudents: number;
  classesCount: number;
  attendanceRate: number | null;
  averageGrade: number | null;
  pendingPayments: number;
  todayAttendance: { present: number; absent: number; late: number; excused: number };
  journalToday: number;
  activitiesToday: number;
  announcements: { title: string; date: string }[];
}

/**
 * The overview endpoint is admin/teacher/staff only (PARENT and tenant-less
 * SUPER_ADMIN get 403). Pass the role so we only fetch when allowed — avoids
 * the "zone blanche / 403" on the parent dashboard.
 */
export function useDashboardOverview(role: string | undefined) {
  const allowed = role === 'SCHOOL_ADMIN' || role === 'TEACHER' || role === 'STAFF';
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => fetchApi<DashboardOverview>('/api/dashboard/overview'),
    enabled: allowed,
    staleTime: 30_000,
  });
}
