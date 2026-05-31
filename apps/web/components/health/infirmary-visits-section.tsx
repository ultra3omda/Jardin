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
import { InfirmaryVisitForm } from '@/components/crud/infirmary-visit-form';
import {
  listInfirmaryVisits,
  createInfirmaryVisit,
  updateInfirmaryVisit,
  deleteInfirmaryVisit,
  type InfirmaryVisit,
  type InfirmaryOutcome,
} from '@/lib/api/health';
import type { InfirmaryVisitValues } from '@/lib/validation/health.schemas';

const VISITS_KEY = ['infirmary-visits', 'list'] as const;

const OUTCOME_CONFIG: Record<InfirmaryOutcome, { label: string; color: string }> = {
  RETURNED_TO_CLASS: { label: 'Retour en classe', color: 'bg-green-100 text-green-800' },
  SENT_HOME: { label: 'Renvoyé à la maison', color: 'bg-orange-100 text-orange-800' },
  REFERRED: { label: 'Orienté (médecin)', color: 'bg-blue-100 text-blue-800' },
  EMERGENCY: { label: 'Urgence', color: 'bg-red-100 text-red-800' },
};

function toFormValues(visit: InfirmaryVisit): Partial<InfirmaryVisitValues> {
  return {
    studentId: visit.studentId,
    visitedAt: visit.visitedAt.slice(0, 16),
    reason: visit.reason,
    treatment: visit.treatment ?? '',
    temperature: visit.temperature ?? undefined,
    outcome: visit.outcome,
  };
}

export function InfirmaryVisitsSection({ canManage }: { canManage: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(VISITS_KEY, listInfirmaryVisits);
  const visits = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InfirmaryVisit | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: VISITS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: InfirmaryVisitValues) =>
      createInfirmaryVisit(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Passage enregistré.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: InfirmaryVisitValues }) =>
      updateInfirmaryVisit(requireToken(accessToken), vars.id, {
        visitedAt: vars.values.visitedAt,
        reason: vars.values.reason,
        treatment: vars.values.treatment,
        temperature: vars.values.temperature,
        outcome: vars.values.outcome,
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Passage mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteInfirmaryVisit(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Passage supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Infirmerie"
        description="Journal des passages et soins."
        action={
          canManage ? <Button onClick={() => setCreateOpen(true)}>Nouveau passage</Button> : undefined
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={visits.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les passages."
        emptyTitle="Aucun passage à l'infirmerie"
        emptyDescription="Les passages enregistrés apparaîtront ici."
        emptyAction={
          canManage ? { label: 'Nouveau passage', onClick: () => setCreateOpen(true) } : undefined
        }
        skeletonCols={5}
      >
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Motif</th>
                <th className="px-4 py-3">Issue</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => {
                const cfg = OUTCOME_CONFIG[v.outcome];
                return (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{v.studentName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(v.visitedAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">{v.reason}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditing(v)}>
                            Modifier
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMut.mutate(v.id)}
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

      <CrudModal open={createOpen} title="Nouveau passage" onClose={() => setCreateOpen(false)}>
        <InfirmaryVisitForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier le passage" onClose={() => setEditing(null)}>
        {editing && (
          <InfirmaryVisitForm
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
