'use client';

import { Sparkles, Wallet, UserX } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useRouter, Link } from '@/i18n/routing';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { NotesPanel } from '@/components/dashboard/notes-panel';
import { QuickAction } from '@/components/dashboard/quick-action';
import { AnnouncementsPanel } from '@/components/dashboard/announcements-panel';
import { ToDoPanel, type ToDoItem } from '@/components/dashboard/to-do-panel';
import { getDashboardConfig } from '@/lib/dashboard/config';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useResource } from '@/lib/hooks/use-resource';
import { getDashboardOverview } from '@/lib/api/dashboard';
import { getMyChildren } from '@/lib/api/students';

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
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  // The super-admin has no tenant: the per-tenant dashboard is meaningless for
  // them. Their home is the platform overview (/admin), which shows real
  // (non-demo) figures. Bounce there regardless of the login entry point.
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  useEffect(() => {
    if (isSuperAdmin) router.replace('/admin');
  }, [isSuperAdmin, router]);

  const config = useMemo(() => {
    if (!user) return null;
    return getDashboardConfig(user.role, tenant?.type ?? null);
  }, [user, tenant?.type]);

  const { data, isLoading } = useResource(['dashboard', 'overview'], getDashboardOverview, {
    enabled: !isSuperAdmin,
  });

  // A parent should see WHO their children are (names + class), not just counts.
  const isParent = user?.role === 'PARENT';
  const { data: children } = useResource(['students', 'my-children'], getMyChildren, {
    enabled: isParent,
  });

  if (!user || !config || isSuperAdmin) return null;

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
        return String(data.pendingPayments);
      case 'amountDue':
        return String(data.amountDue);
      case 'newGrades':
        return String(data.newGrades);
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

  const showToDo = user.role === 'SCHOOL_ADMIN' || user.role === 'STAFF';
  const toDoItems: ToDoItem[] = [];
  if (showToDo && data) {
    if (data.pendingPayments > 0) {
      toDoItems.push({
        id: 'unpaid',
        icon: Wallet,
        value: String(data.pendingPayments),
        label: data.pendingPayments > 1 ? 'paiements en retard' : 'paiement en retard',
        detail: `${data.amountDue} TND à recouvrer`,
        href: '/frais/impayes',
        cta: 'Voir',
        tone: 'danger',
      });
    }
    const absToday = data.todayAttendance.absent + data.todayAttendance.late;
    if (absToday > 0) {
      toDoItems.push({
        id: 'absences',
        icon: UserX,
        value: String(absToday),
        label: 'absences/retards du jour',
        href: '/absences',
        cta: 'Pointer',
        tone: 'warn',
      });
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold leading-tight text-ink-900 sm:text-2xl md:text-[28px]">{heading}</h1>
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

      {showToDo ? <ToDoPanel items={toDoItems} /> : null}

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
            href={
              // "Mes enfants" → the child's own detail page (first child).
              kpi.selectorKey === 'childrenCount' && children && children.length > 0
                ? `/children/${children[0].id}`
                : kpi.href
            }
          />
        ))}
      </section>

      {isParent && (children?.length ?? 0) > 0 && (
        <section className="rounded-2xl bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-ink-900">Mes enfants</h2>
          <ul className="flex flex-wrap gap-3">
            {children!.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/children/${c.id}` as never}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2 transition hover:border-pink-200 hover:shadow-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100 text-sm font-semibold text-pink-700">
                    {(c.firstName[0] ?? '').toUpperCase()}
                    {(c.lastName[0] ?? '').toUpperCase()}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink-900">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="block text-xs text-ink-400">
                      {c.className ?? 'Classe non assignée'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
            canManage={!isParent}
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
