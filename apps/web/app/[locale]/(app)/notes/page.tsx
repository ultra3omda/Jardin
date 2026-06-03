'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface ClassOption { id: string; name: string; level: string; schoolYear: string }
interface SubjectGrade { subjectName: string; subjectEmoji?: string; grade: number | null; outOf: number; coefficient: number }
interface ChildGrades { childName: string; className: string; subjects: SubjectGrade[]; average: number | null }

export default function NotesPage() {
  const token = useAuthStore((s) => s.accessToken);
  const isParent = useAuthStore((s) => s.user?.role) === 'PARENT';
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [children, setChildren] = useState<ChildGrades[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // A parent sees ONLY their children's grades (read-only); staff pick a class.
      if (isParent) {
        const res = await fetch('/api/evaluations/my-grades', { headers: { Authorization: `Bearer ${token}` } });
        const data = res.ok ? ((await res.json()) as ChildGrades[]) : [];
        setChildren(data ?? []);
      } else {
        const res = await fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } });
        const data = res.ok ? ((await res.json()) as { items: ClassOption[] }) : { items: [] };
        setClasses(data.items ?? []);
      }
    } catch {
      setClasses([]);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [token, isParent]);

  useEffect(() => { void load(); }, [load]);

  if (isParent) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Notes de mes enfants</h1>
          <p className="text-sm text-muted-foreground">Consultez les notes de vos enfants par matière (période en cours).</p>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : children.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            Aucune note pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child, i) => (
              <div key={i} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-navy-900">{child.childName}</p>
                    <p className="text-sm text-muted-foreground">{child.className}</p>
                  </div>
                  <span className="rounded-full bg-ambre-100 px-3 py-1 text-sm font-semibold text-ambre-700">
                    {child.average === null ? 'Moy. —' : `Moy. ${child.average.toFixed(2)}/20`}
                  </span>
                </div>
                {child.subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune note saisie.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {child.subjects.map((s, j) => (
                      <li key={j} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-ink-900">
                          {s.subjectEmoji ? `${s.subjectEmoji} ` : ''}{s.subjectName}
                        </span>
                        <span className="font-medium text-ink-700">
                          {s.grade === null ? '—' : `${s.grade.toFixed(2)}/${s.outOf}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Saisie des notes</h1>
        <p className="text-sm text-muted-foreground">Sélectionnez une classe pour saisir ou consulter les notes.</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : classes.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Aucune classe configurée.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <a
              key={c.id}
              href={`/classes/${c.id}/grades`}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md hover:border-ambre-300"
            >
              <p className="font-semibold text-navy-900">{c.name}</p>
              <p className="text-sm text-muted-foreground">{c.level}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.schoolYear}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
