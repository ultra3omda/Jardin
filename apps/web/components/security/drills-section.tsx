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
import { SafetyDrillForm } from '@/components/crud/safety-drill-form';
import {
  listSafetyDrills,
  createSafetyDrill,
  updateSafetyDrill,
  deleteSafetyDrill,
  type SafetyDrill,
  type DrillType,
} from '@/lib/api/security';
import type { SafetyDrillValues } from '@/lib/validation/security.schemas';

const DRILLS_KEY = ['safety-drills', 'list'] as const;

const TYPE_LABELS: Record<DrillType, string> = {
  FIRE: 'Incendie',
  EARTHQUAKE: 'Séisme',
  LOCKDOWN: 'Confinement',
  OTHER: 'Autre',
};

function toFormValues(d: SafetyDrill): Partial<SafetyDrillValues> {
  return {
    type: d.type,
    conductedAt: d.conductedAt.slice(0, 16),
    durationMin: d.durationMin ?? undefined,
    notes: d.notes ?? '',
  };
}

export function DrillsSection() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(DRILLS_KEY, listSafetyDrills);
  const drills = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SafetyDrill | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: DRILLS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: SafetyDrillValues) => createSafetyDrill(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Exercice enregistré.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: SafetyDrillValues }) =>
      updateSafetyDrill(requireToken(accessToken), vars.id, vars.values),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Exercice mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSafetyDrill(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Exercice supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Exercices de sécurité"
        description="Exercices d'évacuation et de confinement."
        action={<Button onClick={() => setCreateOpen(true)}>Enregistrer un exercice</Button>}
        isLoading={isLoading}
        isError={isError}
        isEmpty={drills.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les exercices."
        emptyTitle="Aucun exercice"
        emptyDescription="Les exercices de sécurité apparaîtront ici."
        emptyAction={{ label: 'Enregistrer un exercice', onClick: () => setCreateOpen(true) }}
        skeletonCols={4}
      >
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Durée</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drills.map((d) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{TYPE_LABELS[d.type]}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(d.conductedAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.durationMin ? `${d.durationMin} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(d)}>
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMut.mutate(d.id)}
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

      <CrudModal open={createOpen} title="Nouvel exercice" onClose={() => setCreateOpen(false)}>
        <SafetyDrillForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier l&apos;exercice" onClose={() => setEditing(null)}>
        {editing && (
          <SafetyDrillForm
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
