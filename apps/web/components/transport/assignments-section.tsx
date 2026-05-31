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
import { TransportAssignmentForm } from '@/components/crud/transport-assignment-form';
import {
  listTransportAssignments,
  createTransportAssignment,
  deleteTransportAssignment,
  listBusRoutes,
  type TransportDirection,
} from '@/lib/api/transport';
import type { TransportAssignmentValues } from '@/lib/validation/transport.schemas';

const ASSIGNMENTS_KEY = ['transport-assignments', 'list'] as const;
const ROUTES_KEY = ['bus-routes', 'list'] as const;

const DIRECTION_LABELS: Record<TransportDirection, string> = {
  MORNING: 'Matin',
  EVENING: 'Soir',
  BOTH: 'Aller-retour',
};

export function AssignmentsSection({ canManage }: { canManage: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(
    ASSIGNMENTS_KEY,
    listTransportAssignments,
  );
  // Routes are needed for the assignment form's route/stop pickers (managers only).
  const { data: routesData } = useResource(ROUTES_KEY, listBusRoutes, { enabled: canManage });
  const assignments = data?.items ?? [];
  const routes = routesData?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: TransportAssignmentValues) =>
      createTransportAssignment(requireToken(accessToken), {
        studentId: values.studentId,
        routeId: values.routeId,
        stopId: values.stopId || undefined,
        direction: values.direction,
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Affectation créée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTransportAssignment(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Affectation supprimée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Affectations"
        description="Élèves affectés aux lignes de transport."
        action={canManage ? <Button onClick={() => setCreateOpen(true)}>Affecter un élève</Button> : undefined}
        isLoading={isLoading}
        isError={isError}
        isEmpty={assignments.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les affectations."
        emptyTitle="Aucune affectation"
        emptyDescription="Les affectations de transport apparaîtront ici."
        emptyAction={canManage ? { label: 'Affecter un élève', onClick: () => setCreateOpen(true) } : undefined}
        skeletonCols={4}
      >
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Ligne</th>
                <th className="px-4 py-3">Arrêt</th>
                <th className="px-4 py-3">Direction</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{a.studentName}</td>
                  <td className="px-4 py-3">{a.routeName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.stopName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {DIRECTION_LABELS[a.direction]}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMut.mutate(a.id)}
                        disabled={deleteMut.isPending}
                      >
                        Supprimer
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Nouvelle affectation" onClose={() => setCreateOpen(false)}>
        <TransportAssignmentForm
          routes={routes}
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>
    </>
  );
}
