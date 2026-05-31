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
import { MealPlanForm } from '@/components/crud/meal-plan-form';
import {
  listMealPlans,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  type MealPlan,
  type MealRegime,
} from '@/lib/api/canteen';
import type { MealPlanValues } from '@/lib/validation/canteen.schemas';

const PLANS_KEY = ['meal-plans', 'list'] as const;

const REGIME_LABELS: Record<MealRegime, string> = {
  STANDARD: 'Standard',
  VEGETARIAN: 'Végétarien',
  HALAL: 'Halal',
  NO_PORK: 'Sans porc',
  OTHER: 'Autre',
};

function toFormValues(plan: MealPlan): Partial<MealPlanValues> {
  return {
    studentId: plan.studentId,
    regime: plan.regime,
    allergies: plan.allergies ?? '',
    active: plan.active,
    notes: plan.notes ?? '',
  };
}

export function MealPlansSection({ canManage }: { canManage: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(PLANS_KEY, listMealPlans);
  const plans = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<MealPlan | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PLANS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: MealPlanValues) => createMealPlan(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Régime ajouté.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: MealPlanValues }) =>
      updateMealPlan(requireToken(accessToken), vars.id, {
        regime: vars.values.regime,
        allergies: vars.values.allergies,
        active: vars.values.active,
        notes: vars.values.notes,
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Régime mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMealPlan(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Régime supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Régimes alimentaires"
        description="Un régime par élève (allergies, restrictions)."
        action={canManage ? <Button onClick={() => setCreateOpen(true)}>Ajouter un régime</Button> : undefined}
        isLoading={isLoading}
        isError={isError}
        isEmpty={plans.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les régimes."
        emptyTitle="Aucun régime"
        emptyDescription="Les régimes alimentaires des élèves apparaîtront ici."
        emptyAction={canManage ? { label: 'Ajouter un régime', onClick: () => setCreateOpen(true) } : undefined}
        skeletonCols={4}
      >
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Régime</th>
                <th className="px-4 py-3">Allergies</th>
                <th className="px-4 py-3">Statut</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.studentName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {REGIME_LABELS[p.regime]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.allergies ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMut.mutate(p.id)}
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

      <CrudModal open={createOpen} title="Nouveau régime" onClose={() => setCreateOpen(false)}>
        <MealPlanForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier le régime" onClose={() => setEditing(null)}>
        {editing && (
          <MealPlanForm
            key={editing.id}
            defaultValues={toFormValues(editing)}
            hideStudentId
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
