import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type {
  DashboardOverviewDto,
  RecentGradeDto,
  AbsentStudentDto,
} from './dto/dashboard.dto';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR');
}

const EMPTY: DashboardOverviewDto = {
  totalStudents: 0,
  classesCount: 0,
  attendanceRate: null,
  averageGrade: null,
  pendingPayments: 0,
  recentGrades: [],
  announcements: [],
  todayAttendance: { present: 0, absent: 0, late: 0, excused: 0 },
  absentStudents: [],
  journalToday: 0,
  activitiesToday: 0,
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Real school-admin overview, aggregated from the tenant's data. Replaces the
   * former hardcoded DEMO data. "Today" attendance uses the most recent
   * attendance day present so a demo always shows real figures.
   */
  async overview(user: AuthenticatedUser): Promise<DashboardOverviewDto> {
    const tenantId = user.tenantId;
    if (!tenantId) return EMPTY;

    const [totalStudents, classesCount, pendingPayments, gradeAgg, latestAttDay] =
      await Promise.all([
        this.prisma.student.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.class.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.invoice.count({
          where: { tenantId, status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
        }),
        this.prisma.grade.findMany({
          where: { tenantId },
          select: { score: true, evaluation: { select: { maxScore: true } } },
        }),
        this.prisma.attendance.findFirst({
          where: { tenantId },
          orderBy: { date: 'desc' },
          select: { date: true },
        }),
      ]);

    // Average grade normalised to /20.
    let averageGrade: number | null = null;
    if (gradeAgg.length > 0) {
      const sum = gradeAgg.reduce((acc, g) => {
        const max = g.evaluation?.maxScore ?? 20;
        return acc + (max > 0 ? (g.score / max) * 20 : 0);
      }, 0);
      averageGrade = Math.round((sum / gradeAgg.length) * 10) / 10;
    }

    // Recent grades (latest 5) with student + subject names.
    const recentGradeRows = await this.prisma.grade.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        score: true,
        createdAt: true,
        student: { select: { firstName: true, lastName: true } },
        evaluation: { select: { maxScore: true, subject: { select: { name: true } } } },
      },
    });
    const recentGrades: RecentGradeDto[] = recentGradeRows.map((g) => ({
      studentName: `${g.student.firstName} ${g.student.lastName}`,
      subject: g.evaluation?.subject?.name ?? '—',
      score: g.score,
      maxScore: g.evaluation?.maxScore ?? 20,
      date: fmtDate(g.createdAt),
    }));

    // Announcements (latest 3).
    const annRows = await this.prisma.announcement.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { publishAt: 'desc' },
      take: 3,
      select: { title: true, publishAt: true },
    });
    const announcements = annRows.map((a) => ({ title: a.title, date: fmtDate(a.publishAt) }));

    // KG counts: journal entries on the most recent journal day + total active activities.
    const latestJournalDay = await this.prisma.dailyLogEntry.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    const [journalToday, activitiesToday] = await Promise.all([
      latestJournalDay
        ? this.prisma.dailyLogEntry.count({
            where: { tenantId, deletedAt: null, date: latestJournalDay.date },
          })
        : Promise.resolve(0),
      this.prisma.activity.count({ where: { tenantId, deletedAt: null } }),
    ]);

    // Attendance summary for the most recent day with data.
    const todayAttendance = { present: 0, absent: 0, late: 0, excused: 0 };
    let attendanceRate: number | null = null;
    const absentStudents: AbsentStudentDto[] = [];

    if (latestAttDay) {
      const rows = await this.prisma.attendance.findMany({
        where: { tenantId, date: latestAttDay.date },
        select: {
          status: true,
          student: { select: { firstName: true, lastName: true, classroom: true } },
        },
      });
      for (const r of rows) {
        if (r.status === 'PRESENT') todayAttendance.present += 1;
        else if (r.status === 'ABSENT') todayAttendance.absent += 1;
        else if (r.status === 'LATE') todayAttendance.late += 1;
        else if (r.status === 'EXCUSED') todayAttendance.excused += 1;

        if (r.status !== 'PRESENT' && absentStudents.length < 8) {
          absentStudents.push({
            name: `${r.student.firstName} ${r.student.lastName}`,
            className: r.student.classroom ?? '—',
            status: r.status as AbsentStudentDto['status'],
          });
        }
      }
      if (rows.length > 0) {
        attendanceRate = Math.round((todayAttendance.present / rows.length) * 100);
      }
    }

    return {
      totalStudents,
      classesCount,
      attendanceRate,
      averageGrade,
      pendingPayments,
      recentGrades,
      announcements,
      todayAttendance,
      absentStudents,
      journalToday,
      activitiesToday,
    };
  }
}
