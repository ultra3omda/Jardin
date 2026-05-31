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
import { StaffCreateForm, StaffEditForm } from '@/components/crud/staff-form';
import {
  listStaff,
  createStaff,
  updateStaff,
  type StaffUser,
  type StaffMutationResult,
} from '@/lib/api/staff';
import type { CreateStaffValues, EditStaffValues } from '@/lib/validation/staff.schemas';

const STAFF_KEY = ['hr', 'staff', 'list'] as const;

export function StaffSection() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(STAFF_KEY, listStaff);
  const staff = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: STAFF_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: CreateStaffValues) => createStaff(requireToken(accessToken), values),
    onSuccess: (result: StaffMutationResult) => {
      invalidate();
      setCreateOpen(false);
      toast.success('Employé créé.');
      if (result.tempPassword) {
        setTempPassword({
          name: `${result.firstName} ${result.lastName}`,
          password: result.tempPassword,
        });
      }
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: EditStaffValues }) =>
      updateStaff(requireToken(accessToken), vars.id, vars.values),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Employé mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => updateStaff(requireToken(accessToken), id, { isActive: false }),
    onSuccess: () => {
      invalidate();
      toast.success('Employé désactivé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Désactivation impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Personnel"
        description="Employés non enseignants de l'établissement."
        action={<Button onClick={() => setCreateOpen(true)}>Ajouter un employé</Button>}
        isLoading={isLoading}
        isError={isError}
        isEmpty={staff.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger le personnel."
        emptyTitle="Aucun employé"
        emptyDescription="Ajoutez les membres du personnel administratif et de service."
        emptyAction={{ label: 'Ajouter un employé', onClick: () => setCreateOpen(true) }}
        skeletonCols={4}
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm" aria-label="Liste du personnel">
            <thead className="bg-slate-50 text-left text-navy-700">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const active = !s.deletedAt;
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-3 font-medium text-navy-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(s)}>
                          Modifier
                        </Button>
                        {active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deactivateMut.mutate(s.id)}
                            disabled={deactivateMut.isPending}
                          >
                            Désactiver
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Ajouter un employé" onClose={() => setCreateOpen(false)}>
        <StaffCreateForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier l'employé" onClose={() => setEditing(null)}>
        {editing && (
          <StaffEditForm
            key={editing.id}
            defaultValues={{ firstName: editing.firstName, lastName: editing.lastName }}
            pending={editMut.isPending}
            onSubmit={(values) => editMut.mutate({ id: editing.id, values })}
            onCancel={() => setEditing(null)}
          />
        )}
      </CrudModal>

      <CrudModal
        open={!!tempPassword}
        title="Mot de passe temporaire"
        onClose={() => setTempPassword(null)}
      >
        {tempPassword && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Communiquez ce mot de passe temporaire à <strong>{tempPassword.name}</strong>. Il ne
              sera plus affiché.
            </p>
            <code className="block rounded-md bg-slate-100 px-4 py-3 text-center text-lg font-bold text-navy-900">
              {tempPassword.password}
            </code>
            <div className="flex justify-end">
              <Button onClick={() => setTempPassword(null)}>J&apos;ai noté</Button>
            </div>
          </div>
        )}
      </CrudModal>
    </>
  );
}
