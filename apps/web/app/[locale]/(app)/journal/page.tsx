'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { DailyLogForm } from '@/components/crud/daily-log-form';
import { listJournal, createDailyLog, type ChildMood, type DailyLog } from '@/lib/api/journal';
import type { CreateDailyLogValues } from '@/lib/validation/journal.schemas';

const JOURNAL_KEY = ['journal', 'list'] as const;

const MOOD_CONFIG: Record<ChildMood, { emoji: string; label: string; color: string }> = {
  HAPPY: { emoji: '😄', label: 'Heureux', color: 'bg-green-100 text-green-800' },
  CALM: { emoji: '🙂', label: 'Calme', color: 'bg-blue-100 text-blue-800' },
  TIRED: { emoji: '😴', label: 'Fatigué', color: 'bg-slate-100 text-slate-700' },
  UPSET: { emoji: '😔', label: 'Contrarié', color: 'bg-orange-100 text-orange-800' },
  SICK: { emoji: '🤒', label: 'Malade', color: 'bg-red-100 text-red-800' },
};

function groupByDate(entries: DailyLog[]): { date: string; items: DailyLog[] }[] {
  const groups = new Map<string, DailyLog[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.date);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(entry.date, [entry]);
    }
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

export default function JournalPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isContributor = user?.role === 'SCHOOL_ADMIN' || user?.role === 'TEACHER';
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(JOURNAL_KEY, listJournal);
  const entries = data?.items ?? [];
  const groups = groupByDate(entries);

  const [createOpen, setCreateOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: (values: CreateDailyLogValues) => createDailyLog(requireToken(accessToken), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
      setCreateOpen(false);
      toast.success('Entrée ajoutée.');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Création impossible.'),
  });

  return (
    <>
      <ResourceListPage
        title="Journal quotidien"
        description="Activités et observations au fil des jours."
        action={
          isContributor ? <Button onClick={() => setCreateOpen(true)}>Ajouter une entrée</Button> : undefined
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={entries.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger le journal."
        emptyTitle="Aucune entrée de journal"
        emptyDescription="Les observations quotidiennes apparaîtront ici."
        emptyAction={
          isContributor ? { label: 'Ajouter une entrée', onClick: () => setCreateOpen(true) } : undefined
        }
        skeletonCols={3}
      >
        <div className="space-y-8">
          {groups.map(({ date, items }) => (
            <section key={date}>
              <h2 className="mb-3 text-base font-semibold text-navy-900">
                {new Date(date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((entry) => {
                  const mc = entry.mood ? MOOD_CONFIG[entry.mood] : null;
                  return (
                    <div key={entry.id} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-navy-900">{entry.studentName}</p>
                        {mc && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${mc.color}`}
                          >
                            {mc.emoji} {mc.label}
                          </span>
                        )}
                      </div>
                      {entry.generalNote && (
                        <p className="line-clamp-3 text-sm text-muted-foreground">{entry.generalNote}</p>
                      )}
                      <dl className="space-y-1 text-xs text-muted-foreground">
                        {entry.meals && (
                          <div className="flex gap-1">
                            <dt className="font-medium text-navy-700">Repas :</dt>
                            <dd>{entry.meals}</dd>
                          </div>
                        )}
                        {entry.nap && (
                          <div className="flex gap-1">
                            <dt className="font-medium text-navy-700">Sieste :</dt>
                            <dd>{entry.nap}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Nouvelle entrée" onClose={() => setCreateOpen(false)}>
        <DailyLogForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>
    </>
  );
}