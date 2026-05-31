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
import { SecurityIncidentForm } from '@/components/crud/security-incident-form';
import {
  listSecurityIncidents,
  createSecurityIncident,
  updateSecurityIncident,
  resolveSecurityIncident,
  deleteSecurityIncident,
  type SecurityIncident,
  type SecurityIncidentType,
  type SecuritySeverity,
} from '@/lib/api/security';
import type { SecurityIncidentValues } from '@/lib/validation/security.schemas';

const INCIDENTS_KEY = ['security-incidents', 'list'] as const;

const TYPE_LABELS: Record<SecurityIncidentType, string> = {
  INTRUSION: 'Intrusion',
  THEFT: 'Vol',
  INJURY: 'Blessure',
  FIRE: 'Incendie',
  OTHER: 'Autre',
};
const SEVERITY_CONFIG: Record<SecuritySeverity, { label: string; color: string }> = {
  LOW: { label: 'Faible', color: 'bg-slate-100 text-slate-700' },
  MEDIUM: { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: 'Élevée', color: 'bg-red-100 text-red-800' },
};

function toFormValues(i: SecurityIncident): Partial<SecurityIncidentValues> {
  return {
    type: i.type,
    severity: i.severity,
    location: i.location ?? '',
    occurredAt: i.occurredAt.slice(0, 16),
    description: i.description,
  };
}

export function IncidentsSection() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(INCIDENTS_KEY, listSecurityIncidents);
  const incidents = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SecurityIncident | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: SecurityIncidentValues) =>
      createSecurityIncident(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Incident enregistré.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: SecurityIncidentValues }) =>
      updateSecurityIncident(requireToken(accessToken), vars.id, vars.values),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Incident mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => resolveSecurityIncident(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Incident résolu.');
    },
    onError: (err) => toast.error(errMsg(err, 'Résolution impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSecurityIncident(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Incident supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Incidents de sécurité"
        description="Intrusions, vols, blessures et autres incidents."
        action={<Button onClick={() => setCreateOpen(true)}>Signaler un incident</Button>}
        isLoading={isLoading}
        isError={isError}
        isEmpty={incidents.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les incidents."
        emptyTitle="Aucun incident"
        emptyDescription="Les incidents de sécurité apparaîtront ici."
        emptyAction={{ label: 'Signaler un incident', onClick: () => setCreateOpen(true) }}
        skeletonCols={6}
      >
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Gravité</th>
                <th className="px-4 py-3">Lieu</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => {
                const sev = SEVERITY_CONFIG[inc.severity];
                return (
                  <tr key={inc.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inc.occurredAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">{TYPE_LABELS[inc.type]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sev.color}`}
                      >
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inc.location ?? '—'}</td>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Signaler un incident" onClose={() => setCreateOpen(false)}>
        <SecurityIncidentForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier l&apos;incident" onClose={() => setEditing(null)}>
        {editing && (
          <SecurityIncidentForm
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
