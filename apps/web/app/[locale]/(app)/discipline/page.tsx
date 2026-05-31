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
import { DisciplineIncidentForm } from '@/components/crud/discipline-incident-form';
import {
  listDiscipline,
  createIncident,
  updateIncident,
  resolveIncident,
  deleteIncident,
  type DisciplineIncident,
  type DisciplineSeverity,
} from '@/lib/api/discipline';
import type { DisciplineValues } from '@/lib/validation/discipline.schemas';

const DISCIPLINE_KEY = ['discipline', 'list'] as const;

const TYPE_CONFIG: Record<DisciplineSeverity, { label: string; color: string }> = {
  MINOR: { label: 'Mineur', color: 'bg-yellow-100 text-yellow-800' },
  MAJOR: { label: 'Majeur', color: 'bg-orange-100 text-orange-800' },
  SUSPENSION: { label: 'Suspension', color: 'bg-red-100 text-red-800' },
};

function toFormValues(incident: DisciplineIncident): Partial<DisciplineValues> {
  return {
    studentId: incident.studentId,
    type: incident.type,
    occurredAt: incident.occurredAt,
    description: incident.description,
    sanction: incident.sanction ?? '',
  };
}

export default function DisciplinePage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SCHOOL_ADMIN';
  const isContributor = isAdmin || user?.role === 'TEACHER';
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(DISCIPLINE_KEY, listDiscipline);
  const incidents = data?.items ?? [];
  const openCount = incidents.filter((i) => i.status === 'OPEN').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<DisciplineIncident | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: DISCIPLINE_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: DisciplineValues) => createIncident(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Incident signalé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: DisciplineValues }) =>
      updateIncident(requireToken(accessToken), vars.id, {
        type: vars.values.type,
        occurredAt: vars.values.occurredAt,
        description: vars.values.description,
        sanction: vars.values.sanction,
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Incident mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => resolveIncident(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Incident résolu.');
    },
    onError: (err) => toast.error(errMsg(err, 'Résolution impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteIncident(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Incident supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Discipline"
        description={`${openCount} incident(s) en cours · ${resolvedCount} résolu(s).`}
        action={
          isContributor ? (
            <Button onClick={() => setCreateOpen(true)}>Signaler un incident</Button>
          ) : undefined
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={incidents.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les incidents."
        emptyTitle="Aucun incident"
        emptyDescription="Les incidents de discipline apparaîtront ici."
        emptyAction={
          isContributor
            ? { label: 'Signaler un incident', onClick: () => setCreateOpen(true) }
            : undefined
        }
        skeletonCols={6}
      >
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Sanction</th>
                <th className="px-4 py-3">Statut</th>
                {isAdmin && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => {
                const tc = TYPE_CONFIG[inc.type];
                return (
                  <tr key={inc.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inc.occurredAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 font-medium">{inc.studentName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tc.color}`}
                      >
                        {tc.label}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">
                      {inc.description}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {inc.sanction ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          inc.status === 'RESOLVED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {inc.status === 'RESOLVED' ? 'Résolu' : 'En cours'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditing(inc)}>
                            Modifier
                          </Button>
                          {inc.status === 'OPEN' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveMut.mutate(inc.id)}
                              disabled={resolveMut.isPending}
                            >
                              Résoudre
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMut.mutate(inc.id)}
                            disabled={deleteMut.isPending}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Signaler un incident" onClose={() => setCreateOpen(false)}>
        <DisciplineIncidentForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier l&apos;incident" onClose={() => setEditing(null)}>
        {editing && (
          <DisciplineIncidentForm
            key={editing.id}
            defaultValues={toFormValues(editing)}
            submitLabel="Enregistrer"
            pending={editMut.isPending}
            onSubmit={(values) => editMut.mutate({ id: editing.id, values })}
            onCancel={() => setEditing(null)}
          />
        )}
      </CrudModal>
    </>
  );
}
