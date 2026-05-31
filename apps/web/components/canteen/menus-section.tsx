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
import { CanteenMenuForm } from '@/components/crud/canteen-menu-form';
import {
  listCanteenMenus,
  createCanteenMenu,
  updateCanteenMenu,
  deleteCanteenMenu,
  type CanteenMenu,
} from '@/lib/api/canteen';
import type { CanteenMenuValues } from '@/lib/validation/canteen.schemas';

const MENUS_KEY = ['canteen-menus', 'list'] as const;

function toFormValues(menu: CanteenMenu): Partial<CanteenMenuValues> {
  return {
    date: menu.date,
    starter: menu.starter ?? '',
    main: menu.main ?? '',
    dessert: menu.dessert ?? '',
    vegetarian: menu.vegetarian ?? '',
  };
}

export function MenusSection({ canManage }: { canManage: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(MENUS_KEY, listCanteenMenus);
  const menus = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CanteenMenu | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: MENUS_KEY });
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const createMut = useMutation({
    mutationFn: (values: CanteenMenuValues) => createCanteenMenu(requireToken(accessToken), values),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success('Menu ajouté.');
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: CanteenMenuValues }) =>
      updateCanteenMenu(requireToken(accessToken), vars.id, {
        starter: vars.values.starter,
        main: vars.values.main,
        dessert: vars.values.dessert,
        vegetarian: vars.values.vegetarian,
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Menu mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCanteenMenu(requireToken(accessToken), id),
    onSuccess: () => {
      invalidate();
      toast.success('Menu supprimé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Suppression impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Menus de la cantine"
        description="Menus servis par date."
        action={canManage ? <Button onClick={() => setCreateOpen(true)}>Ajouter un menu</Button> : undefined}
        isLoading={isLoading}
        isError={isError}
        isEmpty={menus.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les menus."
        emptyTitle="Aucun menu"
        emptyDescription="Les menus de la cantine apparaîtront ici."
        emptyAction={canManage ? { label: 'Ajouter un menu', onClick: () => setCreateOpen(true) } : undefined}
        skeletonCols={4}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((m) => (
            <div key={m.id} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="border-b pb-2 font-semibold text-navy-900">
                {new Date(m.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Entrée</p>
                  <p>{m.starter ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Plat</p>
                  <p>{m.main ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Dessert</p>
                  <p>{m.dessert ?? '—'}</p>
                </div>
                {m.vegetarian && (
                  <div className="rounded-md bg-green-50 px-2 py-1">
                    <p className="text-xs font-medium uppercase text-green-700">Végétarien</p>
                    <p className="text-xs text-green-800">{m.vegetarian}</p>
                  </div>
                )}
              </div>
              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMut.mutate(m.id)}
                    disabled={deleteMut.isPending}
                  >
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Nouveau menu" onClose={() => setCreateOpen(false)}>
        <CanteenMenuForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier le menu" onClose={() => setEditing(null)}>
        {editing && (
          <CanteenMenuForm
            key={editing.id}
            defaultValues={toFormValues(editing)}
            hideDate
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
