'use client';

import { useState } from 'react';

import {
  useDishes,
  useUpdateDish,
  useDeleteDish,
  type Dish,
} from '@/lib/api/canteen-reservation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useToast } from '@/lib/ui/use-toast';
import { CreateDishModal } from './create-dish-modal';

const TABLE_COLUMNS = ['Plat', 'Ingrédients', 'Allergènes', 'Statut', 'Actions'];

function TagList({ values, tone }: { values: string[]; tone: 'neutral' | 'warning' }) {
  if (values.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
  const cls =
    tone === 'warning'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
      : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200';
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <span key={v} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
          {v}
        </span>
      ))}
    </div>
  );
}

export function DishesClient() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  const { data, isLoading, isError, refetch } = useDishes();
  const updateMutation = useUpdateDish();
  const deleteMutation = useDeleteDish();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Dish | null>(null);

  if (!canManage) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Accès non autorisé : la gestion des plats est réservée à la direction et au personnel.
      </div>
    );
  }

  function toggleActive(dish: Dish) {
    updateMutation.mutate(
      { id: dish.id, data: { active: !dish.active } },
      {
        onSuccess: () =>
          toast.success(dish.active ? 'Plat désactivé.' : 'Plat activé.'),
        onError: () => toast.error('Action impossible.'),
      },
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Plat supprimé.');
        setDeleting(null);
      },
      onError: () => toast.error('Suppression impossible.'),
    });
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
        >
          + Nouveau plat
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2" role="status" aria-label="Chargement des plats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger les plats.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            Réessayer
          </button>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucun plat pour l&apos;instant.</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Créer le premier plat →
          </button>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {TABLE_COLUMNS.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                      col === 'Actions' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((dish) => (
                <tr key={dish.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{dish.name}</td>
                  <td className="px-4 py-3">
                    <TagList values={dish.ingredients} tone="neutral" />
                  </td>
                  <td className="px-4 py-3">
                    <TagList values={dish.allergens} tone="warning" />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        dish.active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                      }`}
                    >
                      {dish.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => toggleActive(dish)}
                        disabled={updateMutation.isPending}
                        aria-label={`${dish.active ? 'Désactiver' : 'Activer'} le plat ${dish.name}`}
                        title={dish.active ? 'Désactiver' : 'Activer'}
                        className="rounded p-1 text-base hover:bg-muted disabled:opacity-50"
                      >
                        {dish.active ? '🔕' : '✅'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(dish)}
                        aria-label={`Supprimer le plat ${dish.name}`}
                        title="Supprimer"
                        className="rounded p-1 text-base hover:bg-muted"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateDishModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {deleting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dish-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="delete-dish-title" className="text-lg font-semibold">
              Supprimer ce plat ?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              «&nbsp;{deleting.name}&nbsp;» sera définitivement retiré du catalogue. Cette action est
              irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
