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
import { VisitorLogForm } from '@/components/crud/visitor-log-form';
import {
  listVisitorLogs,
  createVisitorLog,
  updateVisitorLog,
  deleteVisitorLog,
  type VisitorLog,
} from '@/lib/api/security';
import type { VisitorLogValues } from '@/lib/validation/security.schemas';

const VISITORS_KEY = ['visitor-logs', 'list'] as const;

function fmt(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toFormValues(v: VisitorLog): Partial<VisitorLogValues> {
  return {
    visitorName: v.visitorName,
    reason: v.reason ?? '',
    checkInAt: v.checkInAt.slice(0, 16),
    checkOutAt: v.checkOutAt ? v.checkOutAt.slice(0, 16) : '',
    badgeNumber: v.badgeNumber ?? '',
  };
}

export function VisitorsSection() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(VISITORS_KEY, listVisitorLogs);
  const visitors = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VisitorLog | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: VISITORS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const toPayload = (v: VisitorLogValues) => ({
    visitorName: v.visitorName,
    reason: v.reason,
    checkInAt: v.checkInAt,
    checkOutAt: v.checkOutAt || undefined,
    badgeNumber: v.badgeNumber,
  });

  const createMut = useMutation({
    mutationFn: (values: VisitorLogValues) => createVisitorLog(requireToken(accessToken), toPayload(values)),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Visiteur enregistré.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: VisitorLogValues }) =>
      updateVisitorLog(requireToken(accessToken), vars.id, toPayload(vars.values)),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Visiteur mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteVisitorLog(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Entrée supprimée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Journal des visiteurs"
        description="Entrées et sorties des visiteurs."
        action={<Button onClick={() => setCreateOpen(true)}>Enregistrer un visiteur</Button>}
        isLoading={isLoading}
        isError={isError}
        isEmpty={visitors.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger le journal."
        emptyTitle="Aucun visiteur"
        emptyDescription="Les passages de visiteurs apparaîtront ici."
        emptyAction={{ label: 'Enregistrer un visiteur', onClick: () => setCreateOpen(true) }}
        skeletonCols={5}
      >
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Visiteur</th>
                <th className="px-4 py-3">Motif</th>
                <th className="px-4 py-3">Entrée</th>
                <th className="px-4 py-3">Sortie</th>
                <th className="px-4 py-3">Badge</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{v.visitorName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{v.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmt(v.checkInAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmt(v.checkOutAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{v.badgeNumber ?? '—'}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Nouveau visiteur" onClose={() => setCreateOpen(false)}>
        <VisitorLogForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier le visiteur" onClose={() => setEditing(null)}>
        {editing && (
          <VisitorLogForm
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
