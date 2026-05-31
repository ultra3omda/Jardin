'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import {
  EmploymentContractForm,
  type EmployeeOption,
} from '@/components/crud/employment-contract-form';
import { listStaff, listTeachers } from '@/lib/api/staff';
import {
  listContracts,
  createContract,
  updateContract,
  endContract,
  deleteContract,
  type EmploymentContract,
  type ContractType,
} from '@/lib/api/hr';
import type { EmploymentContractValues } from '@/lib/validation/hr.schemas';

const CONTRACTS_KEY = ['hr', 'contracts', 'list'] as const;
const EMPLOYEES_KEY = ['hr', 'employees', 'picker'] as const;

const TYPE_LABELS: Record<ContractType, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  VACATAIRE: 'Vacataire',
  TEMPS_PARTIEL: 'Temps partiel',
};

function toFormValues(c: EmploymentContract): Partial<EmploymentContractValues> {
  return {
    userId: c.userId,
    type: c.type,
    startDate: c.startDate.slice(0, 10),
    endDate: c.endDate ? c.endDate.slice(0, 10) : '',
    baseSalary: Number(c.baseSalary),
    weeklyHours: c.weeklyHours ?? undefined,
    notes: c.notes ?? '',
  };
}

function toPayload(v: EmploymentContractValues) {
  return {
    userId: v.userId,
    type: v.type,
    startDate: new Date(v.startDate).toISOString(),
    endDate: v.endDate ? new Date(v.endDate).toISOString() : undefined,
    baseSalary: v.baseSalary,
    weeklyHours: v.weeklyHours,
    notes: v.notes,
  };
}

export function ContractsSection() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(CONTRACTS_KEY, listContracts);
  const contracts = data?.items ?? [];

  // Employee picker = teachers + staff combined.
  const { data: employeesData } = useQuery({
    queryKey: EMPLOYEES_KEY,
    enabled: !!accessToken,
    queryFn: async () => {
      const token = requireToken(accessToken);
      const [teachers, staff] = await Promise.all([listTeachers(token), listStaff(token)]);
      return [...teachers.items, ...staff.items];
    },
  });

  const employees: EmployeeOption[] = useMemo(
    () =>
      (employeesData ?? [])
        .map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName} (${e.email})` }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    [employeesData],
  );
  const employeeName = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employeesData ?? []) map.set(e.id, `${e.firstName} ${e.lastName}`);
    return map;
  }, [employeesData]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EmploymentContract | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: CONTRACTS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: EmploymentContractValues) =>
      createContract(requireToken(accessToken), toPayload(values)),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Contrat créé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: EmploymentContractValues }) => {
      const { userId: _userId, ...rest } = toPayload(vars.values);
      return updateContract(requireToken(accessToken), vars.id, rest);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Contrat mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const endMut = useMutation({
    mutationFn: (id: string) => endContract(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Contrat clôturé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Clôture impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteContract(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Contrat supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Contrats"
        description="Contrats de travail du personnel et des enseignants."
        action={
          <Button onClick={() => setCreateOpen(true)} disabled={employees.length === 0}>
            Nouveau contrat
          </Button>
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={contracts.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les contrats."
        emptyTitle="Aucun contrat"
        emptyDescription="Créez le premier contrat de travail pour un employé."
        emptyAction={{ label: 'Nouveau contrat', onClick: () => setCreateOpen(true) }}
        skeletonCols={6}
      >
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Employé</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Salaire</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{employeeName.get(c.userId) ?? c.userId}</td>
                  <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[c.type]}</td>
                  <td className="px-4 py-3 font-mono">
                    {Number(c.baseSalary).toLocaleString('fr-FR')} {c.currency}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.startDate).toLocaleDateString('fr-FR')}
                    {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString('fr-FR')}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.status === 'ACTIVE' ? 'Actif' : 'Terminé'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(c)}>
                        Modifier
                      </Button>
                      {c.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => endMut.mutate(c.id)}
                          disabled={endMut.isPending}
                        >
                          Clôturer
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMut.mutate(c.id)}
                        disabled={deleteMut.isPending}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Nouveau contrat" onClose={() => setCreateOpen(false)}>
        <EmploymentContractForm
          employees={employees}
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier le contrat" onClose={() => setEditing(null)}>
        {editing && (
          <EmploymentContractForm
            key={editing.id}
            employees={employees}
            employeeLocked
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
