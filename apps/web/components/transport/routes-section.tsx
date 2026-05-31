'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { BusRouteForm } from '@/components/crud/bus-route-form';
import {
  listBusRoutes,
  createBusRoute,
  updateBusRoute,
  deleteBusRoute,
  addBusStop,
  removeBusStop,
  type BusRoute,
  type RouteStatus,
} from '@/lib/api/transport';
import type { BusRouteValues } from '@/lib/validation/transport.schemas';

const ROUTES_KEY = ['bus-routes', 'list'] as const;

const STATUS_CONFIG: Record<RouteStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inactive', color: 'bg-slate-100 text-slate-600' },
};

function toFormValues(route: BusRoute): Partial<BusRouteValues> {
  return {
    name: route.name,
    driverName: route.driverName ?? '',
    driverPhone: route.driverPhone ?? '',
    vehiclePlate: route.vehiclePlate ?? '',
    departureTime: route.departureTime,
    returnTime: route.returnTime ?? '',
    status: route.status,
    capacity: route.capacity ?? undefined,
  };
}

export function RoutesSection({ canManage }: { canManage: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(ROUTES_KEY, listBusRoutes);
  const routes = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BusRoute | null>(null);
  const [addStopFor, setAddStopFor] = useState<BusRoute | null>(null);
  const [stopName, setStopName] = useState('');
  const [stopTime, setStopTime] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ROUTES_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: BusRouteValues) =>
      createBusRoute(requireToken(accessToken), {
        ...values,
        returnTime: values.returnTime || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Ligne créée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: BusRouteValues }) =>
      updateBusRoute(requireToken(accessToken), vars.id, {
        ...vars.values,
        returnTime: vars.values.returnTime || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Ligne mise à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBusRoute(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Ligne supprimée.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  const addStopMut = useMutation({
    mutationFn: (vars: { routeId: string; name: string; order: number; pickupTime?: string }) =>
      addBusStop(requireToken(accessToken), vars.routeId, {
        name: vars.name,
        order: vars.order,
        pickupTime: vars.pickupTime || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setAddStopFor(null);
      setStopName('');
      setStopTime('');
      toast.success('Arrêt ajouté.');
    },
    onError: (err) => toast.error(errMsg(err, 'Ajout impossible.')),
  });

  const removeStopMut = useMutation({
    mutationFn: (vars: { routeId: string; stopId: string }) =>
      removeBusStop(requireToken(accessToken), vars.routeId, vars.stopId),
    onSuccess: () => {
      invalidate();
      toast.success('Arrêt supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Lignes de bus"
        description="Lignes, arrêts et chauffeurs."
        action={canManage ? <Button onClick={() => setCreateOpen(true)}>Ajouter une ligne</Button> : undefined}
        isLoading={isLoading}
        isError={isError}
        isEmpty={routes.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les lignes."
        emptyTitle="Aucune ligne de transport"
        emptyDescription="Les lignes de bus apparaîtront ici."
        emptyAction={canManage ? { label: 'Ajouter une ligne', onClick: () => setCreateOpen(true) } : undefined}
        skeletonCols={3}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => {
            const sc = STATUS_CONFIG[route.status];
            return (
              <div key={route.id} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-navy-900">{route.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sc.color}`}
                  >
                    {sc.label}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Chauffeur</p>
                    <p className="font-medium">{route.driverName ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Immatriculation</p>
                    <p className="font-mono">{route.vehiclePlate ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Départ</p>
                    <p>{route.departureTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Retour</p>
                    <p>{route.returnTime ?? '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Arrêts ({route.assignmentCount} élève{route.assignmentCount > 1 ? 's' : ''})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {route.stops.length === 0 && (
                      <span className="text-xs text-muted-foreground">Aucun arrêt</span>
                    )}
                    {route.stops.map((stop) => (
                      <span
                        key={stop.id}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                      >
                        {stop.name}
                        {stop.pickupTime ? ` · ${stop.pickupTime}` : ''}
                        {canManage && (
                          <button
                            type="button"
                            aria-label={`Supprimer l'arrêt ${stop.name}`}
                            className="ml-0.5 text-slate-400 hover:text-red-600"
                            onClick={() => removeStopMut.mutate({ routeId: route.id, stopId: stop.id })}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => setAddStopFor(route)}>
                      Ajouter un arrêt
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(route)}>
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMut.mutate(route.id)}
                      disabled={deleteMut.isPending}
                    >
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Nouvelle ligne" onClose={() => setCreateOpen(false)}>
        <BusRouteForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier la ligne" onClose={() => setEditing(null)}>
        {editing && (
          <BusRouteForm
            key={editing.id}
            defaultValues={toFormValues(editing)}
            submitLabel="Enregistrer"
            pending={editMut.isPending}
            onSubmit={(values) => editMut.mutate({ id: editing.id, values })}
            onCancel={() => setEditing(null)}
          />
        )}
      </CrudModal>

      <CrudModal open={!!addStopFor} title="Ajouter un arrêt" onClose={() => setAddStopFor(null)}>
        {addStopFor && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nom de l&apos;arrêt</label>
              <Input value={stopName} onChange={(e) => setStopName(e.target.value)} placeholder="Ariana Centre" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Heure de passage (optionnel)</label>
              <Input type="time" value={stopTime} onChange={(e) => setStopTime(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddStopFor(null)} disabled={addStopMut.isPending}>
                Annuler
              </Button>
              <Button
                disabled={addStopMut.isPending || stopName.trim() === ''}
                onClick={() =>
                  addStopMut.mutate({
                    routeId: addStopFor.id,
                    name: stopName.trim(),
                    order: addStopFor.stops.length,
                    pickupTime: stopTime || undefined,
                  })
                }
              >
                {addStopMut.isPending ? 'En cours…' : 'Ajouter'}
              </Button>
            </div>
          </div>
        )}
      </CrudModal>
    </>
  );
}
