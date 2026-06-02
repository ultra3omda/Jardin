import { apiGet } from './http';

export interface DashboardRecentGrade {
  studentName: string;
  subject: string;
  score: number;
  maxScore: number;
  date: string;
}

export interface DashboardAnnouncement {
  title: string;
  date: string;
}

export interface DashboardAbsentStudent {
  name: string;
  className: string;
  status: 'ABSENT' | 'LATE' | 'EXCUSED';
}

export interface DashboardOverview {
  totalStudents: number;
  classesCount: number;
  attendanceRate: number | null;
  averageGrade: number | null;
  pendingPayments: number;
  newGrades: number;
  amountDue: number;
  recentGrades: DashboardRecentGrade[];
  announcements: DashboardAnnouncement[];
  todayAttendance: { present: number; absent: number; late: number; excused: number };
  absentStudents: DashboardAbsentStudent[];
  journalToday: number;
  activitiesToday: number;
}

export function getDashboardOverview(token: string): Promise<DashboardOverview> {
  return apiGet<DashboardOverview>('/api/dashboard/overview', token);
}
