'use client';

import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';

import { KpiCard } from '@/components/dashboard/kpi-card';
import { NotesPanel } from '@/components/dashboard/notes-panel';
import { QuickAction } from '@/components/dashboard/quick-action';
import { AnnouncementsPanel } from '@/components/dashboard/announcements-panel';
import { getDashboardConfig } from '@/lib/dashboard/config';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useResource } from '@/lib/hooks/use-resource';
import { getDashboardOverview } from '@/lib/api/dashboard';

export const dynamic = 'force-dynamic';

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

const STATUS_LABEL: Record<'ABSENT' | 'LATE' | 'EXCUSED', { label: string; cls: string }> = {
  ABSENT: { label: 'Absent', cls: 'bg-red-100 text-red-700' },
  LATE: { label: 'Retard', cls: 'bg-yellow-100 text-yellow-700' },
  EXCUSED: { label: 'Excusé', cls: 'bg-slate-100 text-slate-600' },
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  const config = useMemo(() => {
    if (!user) return null;
    return getDashboardConfig(user.role, tenant?.type ?? null);
  }, [user, tenant?.type]);

  const { data, isLoading } = useResource(['dashboard', 'overview'], getDashboardOverview);

  if (!user || !config) return null;

  const heading = interpolate(config.heading, {
    firstName: user.firstName ?? '',
    childFirstName: '',
    tenantName: tenant?.name ?? '',
  });

  const subtitle = `Vue d'ensemble · ${new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  // Map real overview values onto the role-configured KPI cards.
  const kpiValue = (selectorKey: string): string => {
    if (!data) return '—';
    switch (selectorKey) {
      case 'studentsCount':
      case 'childrenCount':
      case 'myStudentsCount':
        return String(data.totalStudents);
      case 'classesCount':
        return String(data.classesCount);
      case 'attendanceRate':
      case 'presenceToday':
        return data.attendanceRate === null ? '—' : `${data.attendanceRate}`;
      case 'presentToday':
        return String(data.todayAttendance.present);
      case 'globalAverage':
        return data.averageGrade === null ? '—' : String(data.averageGrade);
      case 'overduePayments':
      case 'amountDue':
        return String(data.pendingPayments);
      case 'photosToday':
        return String(data.journalToday);
      case 'activitiesToday':
        return String(data.activitiesToday);
      default:
        return '—';
    }
  };

  // KPI `sub` may contain a {classesCount} placeholder → interpolate with data.
  const kpiSub = (sub: string | undefined): string | undefined =>
    sub === undefined
      ? undefined
      : interpolate(sub, { classesCount: data ? String(data.classesCount) : '—' });

  const att = data?.todayAttendance ?? { present: 0, absent: 0, late: 0, excused: 0 };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-ink-900">{heading}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-2 text-sm text-ink-900 shadow-sm hover:shadow-md"
        >
          <Sparkles className="h-4 w-4 text-ambre-500" aria-hidden="true" />
          Statistiques
        </button>
      </header>

      <section
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
      >
        {config.kpis.map((kpi, i) => (
          <KpiCard
            key={i}
            label={kpi.label}
            value={isLoading ? '…' : kpiValue(kpi.selectorKey)}
            variant={kpi.variant}
            icon={kpi.icon}
            sub={kpiSub(kpi.sub)}
          />
        ))}
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {config.actions.map((a, i) => (
          <QuickAction key={i} label={a.label} href={a.href} icon={a.icon} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          {config.panels.includes('latestNotes') && (
            <NotesPanel
              notes={(data?.recentGrades ?? []).map((g, i) => ({
                id: `g${i}`,
                studentName: g.studentName,
                subjectName: g.subject,
                scaledScore: g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 200) / 10 : g.score,
                date: g.date,
              }))}
            />
          )}

          {config.panels.includes('absencesToday') && (
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-900">Absences du jour</h2>
                <span className="text-xs text-ink-300">Dernier relevé</span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Présents', value: att.present, color: 'text-green-600 bg-green-50' },
                  { label: 'Absents', value: att.absent, color: 'text-red-600 bg-red-50' },
                  { label: 'Retards', value: att.late, color: 'text-yellow-600 bg-yellow-50' },
                  { label: 'Excusés', value: att.excused, color: 'text-slate-600 bg-slate-50' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
              {(data?.absentStudents ?? []).length === 0 ? (
                <p className="px-1 py-2 text-sm text-ink-300">Aucune absence à signaler.</p>
              ) : (
                <ul className="space-y-2">
                  {data!.absentStudents.map((a, i) => {
                    const st = STATUS_LABEL[a.status];
                    return (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink-900">{a.name}</p>
                          <p className="text-xs text-ink-300">{a.className}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {config.panels.includes('announcements') && (
          <AnnouncementsPanel
            announcements={(data?.announcements ?? []).map((a, i) => ({
              id: `a${i}`,
              title: a.title,
              date: a.date,
            }))}
          />
        )}
      </section>
    </div>
  );
}
