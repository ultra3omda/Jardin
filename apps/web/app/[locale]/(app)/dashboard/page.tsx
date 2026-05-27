'use client';

import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';

import { AnnouncementsPanel } from '@/components/dashboard/announcements-panel';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { NotesPanel } from '@/components/dashboard/notes-panel';
import { QuickAction } from '@/components/dashboard/quick-action';
import { getDashboardConfig } from '@/lib/dashboard/config';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export const dynamic = 'force-dynamic';

// Placeholder data — wired to real APIs in subsequent waves (V8+).
const PLACEHOLDER_DATA = {
  studentsCount: 45,
  attendanceRate: 92,
  overduePayments: 0,
  globalAverage: 14.2,
  classesCount: 17,
  childrenCount: 68,
  presentToday: 62,
  photosToday: 24,
  myStudentsCount: 54,
  evalsToGrade: 8,
  todayLessons: 5,
  newGrades: 5,
  amountDue: 180,
  activitiesToday: 2,
  presenceToday: '✓',
  canteenToday: 284,
  busesActive: 3,
  infirmaryToday: 0,
  tenantsCount: 17,
  usersCount: 1200,
  pendingDemos: 3,
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  const config = useMemo(() => {
    if (!user) return null;
    return getDashboardConfig(user.role, tenant?.type ?? null);
  }, [user, tenant?.type]);

  if (!user || !config) return null;

  const heading = interpolate(config.heading, {
    firstName: user.firstName ?? '',
    childFirstName: 'Yasmine',
    tenantName: tenant?.name ?? '',
  });

  const subtitle = config.subtitleKey === 'today'
    ? `Vue d'ensemble · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
    : config.subtitleKey === 'classesCount'
      ? `${PLACEHOLDER_DATA.classesCount} classes · ${PLACEHOLDER_DATA.myStudentsCount} élèves`
      : config.subtitleKey === 'childrenCount'
        ? `${PLACEHOLDER_DATA.childrenCount} enfants à ${tenant?.name ?? "l'établissement"}`
        : `${PLACEHOLDER_DATA.tenantsCount} écoles · ${PLACEHOLDER_DATA.pendingDemos} demandes en attente`;

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

      <section className="grid gap-4" style={{ gridTemplateColumns: `repeat(${config.kpis.length}, minmax(0, 1fr))` }}>
        {config.kpis.map((kpi, i) => {
          const raw = PLACEHOLDER_DATA[kpi.selectorKey as keyof typeof PLACEHOLDER_DATA];
          const value = raw === undefined ? '—' : String(raw);
          const sub = kpi.sub ? interpolate(kpi.sub, { classesCount: String(PLACEHOLDER_DATA.classesCount) }) : undefined;
          return <KpiCard key={i} label={kpi.label} value={value} variant={kpi.variant} icon={kpi.icon} sub={sub} />;
        })}
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {config.actions.map((a, i) => (
          <QuickAction key={i} label={a.label} href={a.href} icon={a.icon} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          {config.panels.includes('latestNotes') && (
            <NotesPanel
              notes={[
                { id: 'n1', studentName: 'Ibrahima Ba', subjectName: 'Sciences de la Vie et de la Terre', scaledScore: 10.91, date: '2026-02-06' },
                { id: 'n2', studentName: 'Ibrahima Ba', subjectName: 'Sciences de la Vie et de la Terre', scaledScore: 11.77, date: '2026-03-13' },
                { id: 'n3', studentName: 'Ibrahima Ba', subjectName: 'Sciences de la Vie et de la Terre', scaledScore: 11.82, date: '2026-01-04' },
              ]}
            />
          )}
          {config.panels.includes('journalToday') && (
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-bold text-ink-900">Journal du jour</h2>
              <p className="mt-2 text-sm text-ink-500">— V7-B implémentation détaillée à venir —</p>
            </div>
          )}
        </div>
        {config.panels.includes('announcements') && (
          <AnnouncementsPanel announcements={[]} />
        )}
      </section>
    </div>
  );
}
