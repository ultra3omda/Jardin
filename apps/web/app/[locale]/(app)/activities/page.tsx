'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { ActivityForm } from '@/components/crud/activity-form';
import {
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  type Activity,
  type ActivityCategory,
} from '@/lib/api/activities';
import { listTeachers } from '@/lib/api/staff';
import { listClasses } from '@/lib/api/classes';
import { CATEGORIES, type ActivityValues } from '@/lib/validation/activities.schemas';
import { ManageParticipantsModal } from './manage-participants-modal';
import { ActivityReportModal } from './activity-report-modal';

const ACTIVITIES_KEY = ['activities', 'list'] as const;

const CATEGORY_CONFIG: Record<ActivityCategory, { label: string; color: string; emoji: string }> = {
  ART: { label: 'Arts & Culture', color: 'bg-pink-100 text-pink-800', emoji: '🎨' },
  MUSIC: { label: 'Musique', color: 'bg-purple-100 text-purple-800', emoji: '🎵' },
  SPORT: { label: 'Sport', color: 'bg-red-100 text-red-800', emoji: '⚽' },
  OUTING: { label: 'Sorties', color: 'bg-green-100 text-green-800', emoji: '🚌' },
  OTHER: { label: 'Autres', color: 'bg-slate-100 text-slate-700', emoji: '📌' },
};

function formatSchedule(scheduledAt: string | null, durationMin: number | null): string | null {
  if (!scheduledAt) return null;
  const date = new Date(scheduledAt).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return durationMin ? `${date} · ${durationMin} min` : date;
}

function toFormValues(activity: Activity): Partial<ActivityValues> {
  return {
    name: activity.name,
    category: activity.category,
    description: activity.description ?? '',
    scheduledAt: activity.scheduledAt ? activity.scheduledAt.slice(0, 16) : '',
    durationMin: activity.durationMin ?? undefined,
    location: activity.location ?? '',
    responsibleUserId: activity.responsibleUserId ?? '',
    classId: activity.classId ?? '',
  };
}

export default function ActivitiesPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isContributor = user?.role === 'SCHOOL_ADMIN' || user?.role === 'TEACHER';
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(ACTIVITIES_KEY, listActivities);
  const activities = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [managing, setManaging] = useState<Activity | null>(null);
  const [reporting, setReporting] = useState<Activity | null>(null);

  const { data: teachersData } = useQuery({
    queryKey: ['teachers', 'options'],
    queryFn: () => listTeachers(requireToken(accessToken)),
    enabled: !!accessToken && isContributor,
  });
  const responsibleOptions = (teachersData?.items ?? []).map((t) => ({
    id: t.id,
    firstName: t.firstName,
    lastName: t.lastName,
  }));

  const { data: classesData } = useQuery({
    queryKey: ['classes', 'options'],
    queryFn: () => listClasses(requireToken(accessToken)),
    enabled: !!accessToken && isContributor,
  });
  const classOptions = (classesData?.items ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
  }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ACTIVITIES_KEY });
  const errMsg = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

  const createMut = useMutation({
    mutationFn: (values: ActivityValues) => createActivity(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Activité créée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: ActivityValues }) =>
      updateActivity(requireToken(accessToken), vars.id, vars.values),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Activité mise à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteActivity(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Activité supprimée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  const categories = CATEGORIES.filter((cat) => activities.some((a) => a.category === cat));

  return (
    <>
      <ResourceListPage
        title="Activités périscolaires"
        description="Catalogue des activités proposées par l&apos;établissement."
        action={
          isContributor ? <Button onClick={() => setCreateOpen(true)}>Ajouter une activité</Button> : undefined
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={activities.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les activités."
        emptyTitle="Aucune activité"
        emptyDescription="Les activités périscolaires apparaîtront ici."
        emptyAction={
          isContributor ? { label: 'Ajouter une activité', onClick: () => setCreateOpen(true) } : undefined
        }
        skeletonCols={3}
      >
        <div className="space-y-8">
          {categories.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const items = activities.filter((a) => a.category === cat);
            return (
              <section key={cat}>
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy-900">
                  <span>{cfg.emoji}</span> {cfg.label}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((act) => {
                    const schedule = formatSchedule(act.scheduledAt, act.durationMin);
                    return (
                      <div key={act.id} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-navy-900">{act.name}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
                          >
                            {act.participantCount} inscrit{act.participantCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        {act.description && (
                          <p className="text-sm text-muted-foreground">{act.description}</p>
                        )}
                        {schedule && <p className="text-xs capitalize text-muted-foreground">{schedule}</p>}
                        {act.location && <p className="text-xs text-muted-foreground">{act.location}</p>}
                        {act.responsibleName && (
                          <p className="text-xs text-muted-foreground">
                            👤 Responsable : {act.responsibleName}
                          </p>
                        )}
                        {isContributor && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button variant="outline" size="sm" onClick={() => setManaging(act)}>
                              Participants
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setReporting(act)}>
                              Rapport
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditing(act)}>
                              Modifier
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMut.mutate(act.id)}
                              disabled={deleteMut.isPending}
                            >
                              Supprimer
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Nouvelle activité" onClose={() => setCreateOpen(false)}>
        <ActivityForm
          submitLabel="Créer"
          pending={createMut.isPending}
          responsibleOptions={responsibleOptions}
          classOptions={classOptions}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier l&apos;activité" onClose={() => setEditing(null)}>
        {editing && (
          <ActivityForm
            key={editing.id}
            defaultValues={toFormValues(editing)}
            submitLabel="Enregistrer"
            pending={editMut.isPending}
            responsibleOptions={responsibleOptions}
            classOptions={classOptions}
            onSubmit={(values) => editMut.mutate({ id: editing.id, values })}
            onCancel={() => setEditing(null)}
          />
        )}
      </CrudModal>

      {managing && (
        <ManageParticipantsModal
          activity={managing}
          onClose={() => setManaging(null)}
          onChanged={invalidate}
        />
      )}

      {reporting && (
        <ActivityReportModal activity={reporting} onClose={() => setReporting(null)} />
      )}
    </>
  );
}