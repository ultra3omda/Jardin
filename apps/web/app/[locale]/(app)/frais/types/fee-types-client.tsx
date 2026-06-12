'use client';

import { useState } from 'react';

import {
  useFeeTypes,
  useUpdateFeeType,
  useDeleteFeeType,
  formatTnd,
  FEE_CATEGORY_LABELS,
  FEE_RECURRENCE_LABELS,
  type FeeType,
} from '@/lib/api/fees';
import { useToast } from '@/lib/ui/use-toast';
import { CreateFeeTypeModal } from './create-fee-type-modal';

const CATEGORY_BADGE: Record<FeeType['category'], string> = {
  STANDARD: 'bg-slate-100 text-slate-800 dark:bg-navy-900/40 dark:text-slate-200',
  DIVERS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  OPTIONNEL: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
};

const TABLE_COLUMNS = ['Nom', 'Catégorie', 'Récurrence', 'Niveau', 'Montant', 'Année', 'État', 'Actions'];

export function FeeTypesClient() {
  const { data, isLoading, isError, refetch } = useFeeTypes();
  const updateMutation = useUpdateFeeType();
  const deleteMutation = useDeleteFeeType();
  const toast = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<FeeType | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [deleting, setDeleting] = useState<FeeType | null>(null);

  function startEdit(fee: FeeType) {
    setEditing(fee);
    setEditAmount(String(fee.defaultAmount));
  }

  function submitEdit() {
    if (!editing) return;
    const amount = Number(editAmount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Montant invalide.');
      return;
    }
    updateMutation.mutate(
      { id: editing.id, data: { defaultAmount: amount } },
      {
        onSuccess: () => {
          toast.success('Montant mis à jour.');
          setEditing(null);
        },
        onError: () => toast.error('Mise à jour impossible.'),
      },
    );
  }

  function toggleActive(fee: FeeType) {
    updateMutation.mutate(
      { id: fee.id, data: { active: !fee.active } },
      {
        onSuccess: () => toast.success(fee.active ? 'Frais désactivé.' : 'Frais activé.'),
        onError: () => toast.error('Action impossible.'),
      },
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Frais supprimé.');
        setDeleting(null);
      },
      onError: () => toast.error('Suppression impossible.'),
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
        >
          + Nouveau frais
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Chargement du référentiel">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger le référentiel des frais.
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
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucun frais défini pour l&apos;instant.</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Créer le premier frais →
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {TABLE_COLUMNS.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                      col === 'Actions' || col === 'Montant' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((fee) => (
                <tr key={fee.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{fee.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[fee.category]}`}
                    >
                      {FEE_CATEGORY_LABELS[fee.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {FEE_RECURRENCE_LABELS[fee.recurrence]}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{fee.level || '—'}</td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {formatTnd(fee.defaultAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                    {fee.schoolYear}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        fee.active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                      }`}
                    >
                      {fee.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => toggleActive(fee)}
                        disabled={updateMutation.isPending}
                        aria-label={`${fee.active ? 'Désactiver' : 'Activer'} le frais ${fee.name}`}
                        title={fee.active ? 'Désactiver' : 'Activer'}
                        className="rounded p-1 text-base hover:bg-muted disabled:opacity-50"
                      >
                        {fee.active ? '🚫' : '✅'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(fee)}
                        aria-label={`Modifier le montant du frais ${fee.name}`}
                        title="Modifier le montant"
                        className="rounded p-1 text-base hover:bg-muted"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(fee)}
                        aria-label={`Supprimer le frais ${fee.name}`}
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

      <CreateFeeTypeModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Edit amount modal */}
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-fee-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="edit-fee-title" className="text-lg font-semibold">
              Modifier le montant
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{editing.name}</p>
            <label htmlFor="edit-amount" className="mb-1 mt-4 block text-sm font-medium">
              Montant par défaut (TND)
            </label>
            <input
              id="edit-amount"
              type="number"
              min={0}
              step="0.001"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={updateMutation.isPending}
                className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-fee-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="delete-fee-title" className="text-lg font-semibold">
              Supprimer ce frais ?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              «&nbsp;{deleting.name}&nbsp;» sera retiré du référentiel. Cette action est irréversible.
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
