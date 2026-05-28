'use client';

import { Sparkles } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';

import type { Announcement } from '@/components/dashboard/announcements-panel';

import { AnnouncementsPanel } from '@/components/dashboard/announcements-panel';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { NotesPanel } from '@/components/dashboard/notes-panel';
import { QuickAction } from '@/components/dashboard/quick-action';
import { getDashboardConfig } from '@/lib/dashboard/config';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export const dynamic = 'force-dynamic';

const DEMO_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', title: 'Réunion parents-professeurs — 15 mars', date: '2026-03-10' },
  { id: 'a2', title: 'Sortie pédagogique CE2 — musée des sciences', date: '2026-03-08' },
  { id: 'a3', title: 'Fermeture exceptionnelle vendredi 22 mars', date: '2026-03-05' },
];

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
  const accessToken = useAuthStore((s) => s.accessToken);
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEMO_ANNOUNCEMENTS);

  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/announcements?limit=5', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() as Promise<{ items: Array<{ id: string; title: string; createdAt: string }> }> : null)
      .then((d) => {
        if (d?.items?.length) {
          setAnnouncements(d.items.map((a) => ({ id: a.id, title: a.title, date: a.createdAt })));
        }
      })
      .catch(() => { /* keep demo data */ });
  }, [accessToken]);

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
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-900">Journal du jour</h2>
                <span className="text-xs text-ink-300">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <ul className="space-y-3">
                {[
                  { id: 'j1', className: 'CP-A', teacher: 'Mme Martin', activity: 'Lecture — Le Petit Prince chap. 4', mood: '😄' },
                  { id: 'j2', className: 'CE1-B', teacher: 'M. Dupont', activity: 'Calcul mental — tables ×6 et ×7', mood: '🙂' },
                  { id: 'j3', className: 'CM2-A', teacher: 'Mme Leroy', activity: 'Exposé — La Révolution française', mood: '😄' },
                ].map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                    <span className="text-xl leading-none">{e.mood}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{e.activity}</p>
                      <p className="text-xs text-ink-300">{e.className} · {e.teacher}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {config.panels.includes('announcements') && (
          <AnnouncementsPanel announcements={announcements} />
        )}
      </section>
    </div>
  );
}
