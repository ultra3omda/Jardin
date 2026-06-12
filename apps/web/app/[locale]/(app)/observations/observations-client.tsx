'use client';

import { useMemo, useState } from 'react';

import {
  useObservations,
  useUpdateObservation,
  useDeleteObservation,
  formatDateTime,
  OBSERVATION_CATEGORY_LABELS,
  type Observation,
  type ObservationCategory,
} from '@/lib/api/observations';
import { useResource } from '@/lib/hooks/use-resource';
import { listClasses, type SchoolClass } from '@/lib/api/classes';
import { listStudents, type StudentSummary } from '@/lib/api/students';
import { useToast } from '@/lib/ui/use-toast';
import { CreateObservationModal } from './create-observation-modal';
import { EditObservationModal } from './edit-observation-modal';
import { OBSERVATION_CATEGORIES } from '@/lib/validation/observations.schemas';

const CATEGORY_BADGE: Record<ObservationCategory, string> = {
  LANGAGE: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  MOTRICITE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  SOCIAL: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200',
  AUTONOMIE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  COGNITIF: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  ARTISTIQUE: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  AUTRE: 'bg-slate-100 text-slate-800 dark:bg-navy-900/40 dark:text-slate-200',
};

const TABLE_COLUMNS = ['Élève', 'Catégorie', 'Titre', 'Observé le', 'Parent', 'Médias', 'Actions'];

const SELECT =
  'h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function ObservationsClient() {
  const toast = useToast();

  const [classFilter, setClassFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ObservationCategory | ''>('');

  const { data, isLoading, isError, refetch } = useObservations({
    classId: classFilter || undefined,
    category: categoryFilter || undefined,
  });

  const classesQuery = useResource(['observations', 'classes'], (token) => listClasses(token));
  const studentsQuery = useResource(['observations', 'students'], (token) =>
    listStudents(token, { pageSize: 500 }),
  );

  const classes: SchoolClass[] = classesQuery.data?.items ?? [];
  const students: StudentSummary[] = useMemo(
    () => studentsQuery.data?.items ?? [],
    [studentsQuery.data],
  );

  const studentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) map.set(s.id, `${s.firstName} ${s.lastName}`);
    return map;
  }, [students]);

  const updateMutation = useUpdateObservation();
  const deleteMutation = useDeleteObservation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Observation | null>(null);
  const [deleting, setDeleting] = useState<Observation | null>(null);

  function toggleVisible(obs: Observation) {
    updateMutation.mutate(
      { id: obs.id, data: { visibleToParent: !obs.visibleToParent } },
      {
        onSuccess: () =>
          toast.success(
            obs.visibleToParent ? 'Masqué aux parents.' : 'Rendu visible aux parents.',
          ),
        onError: () => toast.error('Action impossible.'),
      },
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Observation supprimée.');
        setDeleting(null);
      },
      onError: () => toast.error('Suppression impossible.'),
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="filter-class" className="mb-1 block text-xs font-medium text-muted-foreground">
              Classe
            </label>
            <select
              id="filter-class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className={SELECT}
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-category" className="mb-1 block text-xs font-medium text-muted-foreground">
              Catégorie
            </label>
            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ObservationCategory | '')}
              className={SELECT}
            >
              <option value="">Toutes les catégories</option>
              {OBSERVATION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {OBSERVATION_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
        >
          + Nouvelle observation
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="mt-6 space-y-2" role="status" aria-label="Chargement des observations">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger les observations.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            Réessayer
          </button>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucune observation pour l&apos;instant.</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Créer la première observation →
          </button>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {TABLE_COLUMNS.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                      col === 'Actions' || col === 'Médias' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((obs) => {
                const firstMedia = obs.media[0];
                return (
                  <tr key={obs.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">
                      {studentNameById.get(obs.studentId) ?? obs.studentId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[obs.category]}`}
                      >
                        {OBSERVATION_CATEGORY_LABELS[obs.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{obs.title}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                      {formatDateTime(obs.observedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          obs.visibleToParent
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                        }`}
                      >
                        {obs.visibleToParent ? 'Visible' : 'Privé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {firstMedia ? (
                        <span className="inline-flex items-center gap-2">
                          {firstMedia.kind === 'PHOTO' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={firstMedia.url}
                              alt=""
                              className="h-9 w-9 rounded object-cover"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="inline-flex h-9 w-9 items-center justify-center rounded bg-muted text-base"
                            >
                              🎬
                            </span>
                          )}
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {obs.media.length}
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleVisible(obs)}
                          disabled={updateMutation.isPending}
                          aria-label={`${obs.visibleToParent ? 'Masquer aux parents' : 'Rendre visible aux parents'} l'observation ${obs.title}`}
                          title={obs.visibleToParent ? 'Masquer aux parents' : 'Rendre visible aux parents'}
                          className="rounded p-1 text-base hover:bg-muted disabled:opacity-50"
                        >
                          {obs.visibleToParent ? '🙈' : '👁️'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(obs)}
                          aria-label={`Modifier l'observation ${obs.title}`}
                          title="Modifier"
                          className="rounded p-1 text-base hover:bg-muted"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(obs)}
                          aria-label={`Supprimer l'observation ${obs.title}`}
                          title="Supprimer"
                          className="rounded p-1 text-base hover:bg-muted"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateObservationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        classes={classes}
        students={students}
      />

      {editing && (
        <EditObservationModal observation={editing} onClose={() => setEditing(null)} />
      )}

      {/* Delete confirm modal */}
      {deleting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-obs-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="delete-obs-title" className="text-lg font-semibold">
              Supprimer cette observation ?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              «&nbsp;{deleting.title}&nbsp;» sera définitivement retirée. Cette action est
              irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
