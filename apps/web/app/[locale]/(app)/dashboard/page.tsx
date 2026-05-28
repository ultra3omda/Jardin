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

          {config.panels.includes('absencesToday') && (
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-900">Absences du jour</h2>
                <span className="text-xs text-ink-300">Aujourd&apos;hui</span>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-3">
                {[
                  { label: 'Présents', value: '38', color: 'text-green-600 bg-green-50' },
                  { label: 'Absents', value: '4', color: 'text-red-600 bg-red-50' },
                  { label: 'Retards', value: '2', color: 'text-yellow-600 bg-yellow-50' },
                  { label: 'Excusés', value: '1', color: 'text-slate-600 bg-slate-50' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
              <ul className="space-y-2">
                {[
                  { name: 'Ibrahima Ba', class: 'CM1-A', status: 'Absent', statusColor: 'bg-red-100 text-red-700' },
                  { name: 'Yasmine Gharbi', class: 'CE2-B', status: 'Retard', statusColor: 'bg-yellow-100 text-yellow-700' },
                  { name: 'Khalil Mejri', class: 'CP-A', status: 'Excusé', statusColor: 'bg-slate-100 text-slate-600' },
                ].map((a, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{a.name}</p>
                      <p className="text-xs text-ink-300">{a.class}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.statusColor}`}>{a.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {config.panels.includes('upcomingDeadlines') && (
            <div className="mt-4 rounded-2xl bg-surface p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-900">Échéances à venir</h2>
                <span className="text-xs text-ink-300">7 prochains jours</span>
              </div>
              <ul className="space-y-2">
                {[
                  { title: 'Conseil de classe CM2-A', date: 'Vendredi 21 mars', type: 'Réunion', typeColor: 'bg-blue-100 text-blue-700' },
                  { title: 'Remise bulletins T2', date: 'Lundi 24 mars', type: 'Administratif', typeColor: 'bg-purple-100 text-purple-700' },
                  { title: 'Sortie pédagogique CE2', date: 'Mercredi 26 mars', type: 'Activité', typeColor: 'bg-green-100 text-green-700' },
                  { title: 'Clôture paiements T2', date: 'Vendredi 28 mars', type: 'Finance', typeColor: 'bg-orange-100 text-orange-700' },
                ].map((d, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{d.title}</p>
                      <p className="text-xs text-ink-300">{d.date}</p>
                    </div>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${d.typeColor}`}>{d.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {config.panels.includes('incidents') && (
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-900">Incidents récents</h2>
                <span className="text-xs text-ink-300">7 derniers jours</span>
              </div>
              <ul className="space-y-2">
                {[
                  { title: 'Bagarre dans la cour', class: 'CE2-A', date: 'Hier', severity: 'Modéré', severityColor: 'bg-orange-100 text-orange-700' },
                  { title: 'Matériel endommagé', class: 'CM1-B', date: 'Il y a 2 jours', severity: 'Mineur', severityColor: 'bg-yellow-100 text-yellow-700' },
                  { title: 'Retard répété', class: 'CP-A', date: 'Il y a 4 jours', severity: 'Mineur', severityColor: 'bg-yellow-100 text-yellow-700' },
                ].map((inc, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{inc.title}</p>
                      <p className="text-xs text-ink-300">{inc.class} · {inc.date}</p>
                    </div>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${inc.severityColor}`}>{inc.severity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {config.panels.includes('demoRequests') && (
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-900">Demandes de démo</h2>
                <span className="rounded-full bg-ambre-100 px-2 py-0.5 text-xs font-semibold text-ambre-700">3 en attente</span>
              </div>
              <ul className="space-y-2">
                {[
                  { school: "École El Amal — Sfax", contact: 'M. Zouari', date: "Aujourd'hui", status: 'Nouveau', statusColor: 'bg-blue-100 text-blue-700' },
                  { school: 'Collège Ibn Khaldoun — Tunis', contact: 'Mme Haddad', date: 'Hier', status: 'Nouveau', statusColor: 'bg-blue-100 text-blue-700' },
                  { school: 'École Privée Les Pins — Sousse', contact: 'M. Karoui', date: 'Il y a 2 jours', status: 'En cours', statusColor: 'bg-yellow-100 text-yellow-700' },
                ].map((req, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{req.school}</p>
                      <p className="text-xs text-ink-300">{req.contact} · {req.date}</p>
                    </div>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${req.statusColor}`}>{req.status}</span>
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
