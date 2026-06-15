'use client';

import { useCallback, useEffect, useState } from 'react';

import { Link } from '@/i18n/routing';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { DetailPage } from '@/components/crud/detail-page';

interface MyChild { id: string; firstName: string; lastName: string; className: string | null }
interface SubjectGrade { subjectName: string; subjectEmoji?: string; grade: number | null; outOf: number }
interface ChildGrades { childName: string; className: string; subjects: SubjectGrade[]; average: number | null }
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
interface Attendance { studentId: string; studentName: string; date: string; status: AttendanceStatus; notes: string | null }

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Présent', ABSENT: 'Absent', LATE: 'Retard', EXCUSED: 'Excusé',
};
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  LATE: 'bg-yellow-100 text-yellow-800',
  EXCUSED: 'bg-slate-100 text-slate-700',
};

async function getJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok ? ((await res.json()) as T) : null;
}

export function ChildDetail({ id }: { id: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const [child, setChild] = useState<MyChild | null>(null);
  const [grades, setGrades] = useState<ChildGrades | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [children, allGrades, allAttendance] = await Promise.all([
        getJson<MyChild[]>('/api/students/my-children', token),
        getJson<ChildGrades[]>('/api/evaluations/my-grades', token),
        getJson<{ items: Attendance[] }>('/api/attendance/my-children', token),
      ]);
      const c = (children ?? []).find((x) => x.id === id) ?? null;
      setChild(c);
      if (c) {
        const fullName = `${c.firstName} ${c.lastName}`.trim();
        setGrades((allGrades ?? []).find((g) => g.childName.trim() === fullName) ?? null);
        setAttendance((allAttendance?.items ?? []).filter((a) => a.studentId === id));
      }
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  if (!child) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">← Retour</Link>
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Enfant introuvable.
        </div>
      </div>
    );
  }

  const initials = `${child.firstName[0] ?? ''}${child.lastName[0] ?? ''}`.toUpperCase();

  return (
    <DetailPage
      backHref="/dashboard"
      backLabel="Mes enfants"
      title={`${child.firstName} ${child.lastName}`}
      subtitle={child.className ?? 'Classe non assignée'}
      avatar={{ initials, className: 'bg-pink-100 text-pink-700' }}
      tabs={[
        { id: 'overview', label: 'Infos' },
        { id: 'grades', label: 'Notes' },
        { id: 'attendance', label: 'Présences' },
      ]}
      panels={{
        overview: (
          <section className="grid gap-4 sm:grid-cols-2">
            <Link href="/bulletins" className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
              <p className="font-semibold text-navy-900">Bulletins</p>
              <p className="text-sm text-muted-foreground">Télécharger le bulletin de notes</p>
            </Link>
            <Link href="/payments" className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
              <p className="font-semibold text-navy-900">Paiements</p>
              <p className="text-sm text-muted-foreground">Factures &amp; règlements</p>
            </Link>
          </section>
        ),
        grades: (
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-navy-900">Notes (période en cours)</h2>
              <span className="rounded-full bg-ambre-100 px-3 py-1 text-sm font-semibold text-ambre-700">
                {grades?.average == null ? 'Moy. —' : `Moy. ${grades.average.toFixed(2)}/20`}
              </span>
            </div>
            {!grades || grades.subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune note saisie.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {grades.subjects.map((s, j) => (
                  <li key={j} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-ink-900">{s.subjectEmoji ? `${s.subjectEmoji} ` : ''}{s.subjectName}</span>
                    <span className="font-medium text-ink-700">{s.grade == null ? '—' : `${s.grade.toFixed(2)}/${s.outOf}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ),
        attendance: (
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-navy-900">Présences récentes</h2>
            {attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun relevé de présence.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {attendance.slice(0, 10).map((a, j) => (
                  <li key={j} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">{new Date(a.date).toLocaleDateString('fr-FR')}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ),
      }}
    />
  );
}
