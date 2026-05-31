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
import { LeaveRequestForm } from '@/components/crud/leave-request-form';
import { listStaff, listTeachers } from '@/lib/api/staff';
import {
  listLeaves,
  getLeaveBalance,
  createLeave,
  reviewLeave,
  deleteLeave,
  type LeaveRequest,
  type LeaveType,
  type LeaveStatus,
} from '@/lib/api/hr';
import type { LeaveRequestValues } from '@/lib/validation/hr.schemas';

const LEAVES_KEY = ['hr', 'leaves', 'list'] as const;
const BALANCE_KEY = ['hr', 'leaves', 'balance'] as const;
const EMPLOYEES_KEY = ['hr', 'employees', 'picker'] as const;

const TYPE_LABELS: Record<LeaveType, string> = {
  PAID: 'Congé payé',
  SICK: 'Maladie',
  UNPAID: 'Sans solde',
  OTHER: 'Autre',
};

const STATUS_CONFIG: Record<LeaveStatus, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800' },
};

export function LeavesSection() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(LEAVES_KEY, listLeaves);
  const leaves = data?.items ?? [];

  const { data: balance } = useResource(BALANCE_KEY, getLeaveBalance);

  // Employee name map (teachers + staff) for display.
  const { data: employeesData } = useQuery({
    queryKey: EMPLOYEES_KEY,
    enabled: !!accessToken,
    queryFn: async () => {
      const token = requireToken(accessToken);
      const [teachers, staff] = await Promise.all([listTeachers(token), listStaff(token)]);
      return [...teachers.items, ...staff.items];
    },
  });
  const employeeName = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employeesData ?? []) map.set(e.id, `${e.firstName} ${e.lastName}`);
    return map;
  }, [employeesData]);

  const [createOpen, setCreateOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: LEAVES_KEY });
    queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
  };
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: LeaveRequestValues) =>
      createLeave(requireToken(accessToken), {
        type: values.type,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
        reason: values.reason,
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Demande de congé créée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const reviewMut = useMutation({
    mutationFn: (vars: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      reviewLeave(requireToken(accessToken), vars.id, { status: vars.status }),
    onSuccess: () => {
      invalidate();
      toast.success('Demande mise à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Action impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLeave(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Demande supprimée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      {balance && (
        <div className="mb-4 flex flex-wrap gap-4 rounded-xl border bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Alloué / an</p>
            <p className="text-lg font-bold text-navy-900">{balance.allowanceDays} j</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pris ({balance.year})</p>
            <p className="text-lg font-bold text-navy-900">{balance.takenDays} j</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Restant</p>
            <p
              className={`text-lg font-bold ${
                balance.remainingDays <= 5 ? 'text-red-700' : 'text-green-700'
              }`}
            >
              {balance.remainingDays} j
            </p>
          </div>
        </div>
      )}

      <ResourceListPage
        title="Congés"
        description="Demandes de congés et workflow d'approbation."
        action={<Button onClick={() => setCreateOpen(true)}>Demander un congé</Button>}
        isLoading={isLoading}
        isError={isError}
        isEmpty={leaves.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les congés."
        emptyTitle="Aucune demande"
        emptyDescription="Les demandes de congés apparaîtront ici."
        emptyAction={{ label: 'Demander un congé', onClick: () => setCreateOpen(true) }}
        skeletonCols={6}
      >
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Employé</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Jours</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => {
                const st = STATUS_CONFIG[l.status];
                return (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{employeeName.get(l.userId) ?? l.userId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[l.type]}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(l.startDate).toLocaleDateString('fr-FR')} →{' '}
                      {new Date(l.endDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">{l.days}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {/* An admin cannot review their own leave (enforced server-side too). */}
                        {l.status === 'PENDING' && l.userId !== currentUserId && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reviewMut.mutate({ id: l.id, status: 'APPROVED' })}
                              disabled={reviewMut.isPending}
                            >
                              Approuver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reviewMut.mutate({ id: l.id, status: 'REJECTED' })}
                              disabled={reviewMut.isPending}
                            >
                              Rejeter
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMut.mutate(l.id)}
                          disabled={deleteMut.isPending}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Demander un congé" onClose={() => setCreateOpen(false)}>
        <LeaveRequestForm
          submitLabel="Envoyer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>
    </>
  );
}
