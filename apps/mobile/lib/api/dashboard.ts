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

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => fetchApi<DashboardOverview>('/api/dashboard/overview'),
    staleTime: 30_000,
  });
}
