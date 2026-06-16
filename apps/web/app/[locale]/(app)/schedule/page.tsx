'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { PageHeader } from '@/components/ui/page-header';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorRetry } from '@/components/ui/error-retry';

interface ClassOption { id: string; name: string }
interface TeacherSummary { id: string; firstName: string; lastName: string }
interface TimeSlot {
  id: string;
  dayOfWeek: number;
  periodStart: string;
  periodEnd: string;
  subject: string;
  room?: string | null;
  teacher?: TeacherSummary | null;
  className?: string;
}
interface ClassDetail { id: string; name: string; schoolYear: string; timeSlots?: TimeSlot[] }

type LoadState = 'loading' | 'error' | 'ready';

const DAYS = [
  { day: 'Lundi', dow: 1 },
  { day: 'Mardi', dow: 2 },
  { day: 'Mercredi', dow: 3 },
  { day: 'Jeudi', dow: 4 },
  { day: 'Vendredi', dow: 5 },
];

const SUBJECT_COLORS: Record<string, string> = {
  'Mathématiques': 'bg-blue-100 text-blue-800 border-blue-200',
  'Français': 'bg-green-100 text-green-800 border-green-200',
  'Sciences': 'bg-purple-100 text-purple-800 border-purple-200',
  'Sciences Naturelles': 'bg-purple-100 text-purple-800 border-purple-200',
  'Histoire-Géographie': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Histoire-Géo': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Éducation Physique': 'bg-red-100 text-red-800 border-red-200',
  'Arts Plastiques': 'bg-pink-100 text-pink-800 border-pink-200',
  'Musique': 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

function colorFor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function SchedulePage() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  // TEACHER and STAFF see ONLY their own timetable (aggregated across classes).
  // SCHOOL_ADMIN / PARENT keep the per-class picker.
  const isOwnView = role === 'TEACHER' || role === 'STAFF';

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [ownSlots, setOwnSlots] = useState<TimeSlot[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Primary load: own timetable (teacher/staff) OR class list (admin/parent) ──
  const loadPrimary = useCallback(async () => {
    if (!token) return;
    setLoadState('loading');
    try {
      if (isOwnView) {
        const r = await fetch('/api/classes/my-schedule', { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = (await r.json()) as { items: TimeSlot[] };
        setOwnSlots(d.items ?? []);
      } else {
        // A parent only picks among their own children's classes (`mine=true`).
        const classesUrl = role === 'PARENT' ? '/api/classes?mine=true' : '/api/classes';
        const r = await fetch(classesUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = (await r.json()) as { items: ClassOption[] };
        const items = d.items ?? [];
        setClasses(items);
        if (items.length > 0) setSelectedClass(items[0].id);
      }
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [token, isOwnView, role]);

  useEffect(() => { void loadPrimary(); }, [loadPrimary]);

  const loadDetail = useCallback(async () => {
    if (!token || isOwnView || !selectedClass) { setDetail(null); return; }
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDetail((await res.json()) as ClassDetail);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [token, isOwnView, selectedClass]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  const slots = isOwnView ? ownSlots : detail?.timeSlots ?? [];
  // Distinct start times, sorted, used as the grid rows.
  const times = [...new Set(slots.map((s) => s.periodStart))].sort();
  const slotAt = (dow: number, time: string): TimeSlot | undefined =>
    slots.find((s) => s.dayOfWeek === dow && s.periodStart === time);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOwnView ? 'Mon emploi du temps' : 'Emploi du temps'}
        description={
          isOwnView ? 'Vos créneaux, toutes classes confondues.' : 'Consultez les emplois du temps par classe.'
        }
      />

      {!isOwnView && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="schedule-class" className="sr-only">
            Classe
          </label>
          <select
            id="schedule-class"
            className="rounded-md border px-3 py-2 text-sm"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loadState === 'loading'}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {detail?.schoolYear && (
            <span className="text-sm text-muted-foreground">Année scolaire {detail.schoolYear}</span>
          )}
        </div>
      )}

      {loadState === 'loading' || loadingDetail ? (
        <TableSkeleton rows={6} cols={6} />
      ) : loadState === 'error' ? (
        <ErrorRetry message="Impossible de charger l'emploi du temps." onRetry={() => void loadPrimary()} />
      ) : !isOwnView && classes.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" aria-hidden="true" />}
          title="Aucune classe disponible"
          description="Aucune classe n'est rattachée à votre compte pour le moment."
        />
      ) : times.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" aria-hidden="true" />}
          title="Aucun créneau"
          description={
            isOwnView
              ? "Aucun créneau ne vous est affecté pour l'instant."
              : 'Aucun créneau configuré pour cette classe.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="w-16 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">Heure</th>
                {DAYS.map((d) => (
                  <th key={d.dow} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-navy-700">
                    {d.day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time) => (
                <tr key={time} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{time}</td>
                  {DAYS.map((d) => {
                    const slot = slotAt(d.dow, time);
                    return (
                      <td key={d.dow} className="px-2 py-2 text-center">
                        {slot ? (
                          <div className={`rounded-lg border px-2 py-1.5 ${colorFor(slot.subject)}`}>
                            <div className="font-medium leading-tight">{slot.subject}</div>
                            {/* Own view: show the class. Per-class view: show the teacher. */}
                            {isOwnView
                              ? slot.className && <div className="mt-0.5 text-xs opacity-75">{slot.className}</div>
                              : slot.teacher && (
                                  <div className="mt-0.5 text-xs opacity-75">
                                    {slot.teacher.firstName} {slot.teacher.lastName}
                                  </div>
                                )}
                            {slot.room && <div className="text-xs opacity-60">{slot.room}</div>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
