export interface RecentGradeDto {
  studentName: string;
  subject: string;
  score: number;
  maxScore: number;
  date: string;
}

export interface AnnouncementBriefDto {
  title: string;
  date: string;
}

export interface AbsentStudentDto {
  name: string;
  className: string;
  status: 'ABSENT' | 'LATE' | 'EXCUSED';
}

export interface DashboardOverviewDto {
  totalStudents: number;
  classesCount: number;
  attendanceRate: number | null;
  averageGrade: number | null;
  pendingPayments: number;
  // Parent-oriented figures (scoped to the connected parent's children).
  // `newGrades` = grades published in the last 14 days; `amountDue` = total
  // unpaid invoice amount (TND, rounded).
  newGrades: number;
  amountDue: number;
  recentGrades: RecentGradeDto[];
  announcements: AnnouncementBriefDto[];
  todayAttendance: { present: number; absent: number; late: number; excused: number };
  absentStudents: AbsentStudentDto[];
  // KG-oriented counts (kindergarten dashboard). Computed for the latest day
  // with data (journal) / current activities.
  journalToday: number;
  activitiesToday: number;
}
