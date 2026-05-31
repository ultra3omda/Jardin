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
import { VaccinationForm } from '@/components/crud/vaccination-form';
import {
  listVaccinations,
  createVaccination,
  updateVaccination,
  deleteVaccination,
  type Vaccination,
} from '@/lib/api/health';
import type { VaccinationValues } from '@/lib/validation/health.schemas';

const VACCINATIONS_KEY = ['vaccinations', 'list'] as const;

function toFormValues(v: Vaccination): Partial<VaccinationValues> {
  return {
    studentId: v.studentId,
    vaccineName: v.vaccineName,
    administeredAt: v.administeredAt,
    nextDueAt: v.nextDueAt ?? '',
    notes: v.notes ?? '',
  };
}

export function VaccinationsSection({ canManage }: { canManage: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(VACCINATIONS_KEY, listVaccinations);
  const vaccinations = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Vaccination | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: VACCINATIONS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: VaccinationValues) => createVaccination(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Vaccination ajoutée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: VaccinationValues }) =>
      updateVaccination(requireToken(accessToken), vars.id, {
        vaccineName: vars.values.vaccineName,
        administeredAt: vars.values.administeredAt,
        nextDueAt: vars.values.nextDueAt,
        notes: vars.values.notes,
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Vaccination mise à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteVaccination(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Vaccination supprimée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Vaccinations"
        description="Carnet vaccinal des élèves."
        action={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>Ajouter une vaccination</Button>
          ) : undefined
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={vaccinations.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les vaccinations."
        emptyTitle="Aucune vaccination"
        emptyDescription="Les vaccinations enregistrées apparaîtront ici."
        emptyAction={
          canManage
            ? { label: 'Ajouter une vaccination', onClick: () => setCreateOpen(true) }
            : undefined
        }
        skeletonCols={5}
      >
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Vaccin</th>
                <th className="px-4 py-3">Administré le</th>
                <th className="px-4 py-3">Prochain rappel</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {vaccinations.map((v) => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{v.studentName}</td>
                  <td className="px-4 py-3">{v.vaccineName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(v.administeredAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {v.nextDueAt ? new Date(v.nextDueAt).toLocaleDateString('fr-FR') : '—'}
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
              ))}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Nouvelle vaccination" onClose={() => setCreateOpen(false)}>
        <VaccinationForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier la vaccination" onClose={() => setEditing(null)}>
        {editing && (
          <VaccinationForm
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
