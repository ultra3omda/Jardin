'use client';

import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, BookOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorRetry } from '@/components/ui/error-retry';
import { GradeBadge } from '@/components/grades/grade-badge';

interface ClassOption { id: string; name: string; level: string; schoolYear: string }
interface SubjectGrade { subjectName: string; subjectEmoji?: string; grade: number | null; outOf: number; coefficient: number }
interface ChildGrades { childName: string; className: string; subjects: SubjectGrade[]; average: number | null }

type LoadState = 'loading' | 'error' | 'ready';

export default function NotesPage() {
  const token = useAuthStore((s) => s.accessToken);
  const isParent = useAuthStore((s) => s.user?.role) === 'PARENT';
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [children, setChildren] = useState<ChildGrades[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const load = useCallback(async () => {
    if (!token) return;
    setLoadState('loading');
    try {
      if (isParent) {
        const res = await fetch('/api/evaluations/my-grades', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ChildGrades[];
        setChildren(data ?? []);
      } else {
        const res = await fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items: ClassOption[] };
        setClasses(data.items ?? []);
      }
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [token, isParent]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isParent) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Notes de mes enfants"
          description="Consultez les notes de vos enfants par matière (période en cours)."
        />

        {loadState === 'loading' ? (
          <div className="space-y-4" role="status" aria-busy="true">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : loadState === 'error' ? (
          <ErrorRetry message="Impossible de charger les notes." onRetry={() => void load()} />
        ) : children.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="h-8 w-8" aria-hidden="true" />}
            title="Aucune note pour le moment"
            description="Les notes apparaîtront ici dès que l'établissement les aura saisies."
          />
        ) : (
          <div className="space-y-4">
            {children.map((child, i) => (
              <div key={i} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-navy-900">{child.childName}</p>
                    <p className="text-sm text-muted-foreground">{child.className}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Moyenne</span>
                    <GradeBadge value={child.average} />
                  </div>
                </div>
                {child.subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune note saisie.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {child.subjects.map((s, j) => (
                      <li key={j} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-ink-900">
                          {s.subjectEmoji ? `${s.subjectEmoji} ` : ''}
                          {s.subjectName}
                        </span>
                        <GradeBadge value={s.grade} outOf={s.outOf} />
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
      <PageHeader
        title="Saisie des notes"
        description="Sélectionnez une classe pour saisir ou consulter les notes."
      />

      {loadState === 'loading' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : loadState === 'error' ? (
        <ErrorRetry message="Impossible de charger les classes." onRetry={() => void load()} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" aria-hidden="true" />}
          title="Aucune classe configurée"
          description="Créez une classe pour commencer la saisie des notes."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link
              key={c.id}
              href={`/classes/${c.id}/grades` as never}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-ambre-300 hover:shadow-md"
            >
              <p className="font-semibold text-navy-900">{c.name}</p>
              <p className="text-sm text-muted-foreground">{c.level}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.schoolYear}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
