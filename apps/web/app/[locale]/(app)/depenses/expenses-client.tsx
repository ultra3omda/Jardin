'use client';

import { useMemo, useState } from 'react';

import {
  useExpenses,
  useSuppliers,
  useDeleteExpense,
  formatTnd,
  formatDate,
  EXPENSE_METHOD_LABELS,
  type ExpenseMethod,
  type Expense,
} from '@/lib/api/cash-register';
import { useToast } from '@/lib/ui/use-toast';
import { CreateExpenseModal } from './create-expense-modal';

const TABLE_COLUMNS = ['Date', 'Catégorie', 'Fournisseur', 'Méthode', 'Référence', 'Montant', 'Actions'];

export function ExpensesClient() {
  const { data, isLoading, isError, refetch } = useExpenses();
  const { data: suppliers } = useSuppliers();
  const deleteMutation = useDeleteExpense();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Dépense supprimée.');
        setDeleting(null);
      },
      onError: (err) =>
        toast.error(err instanceof Error && err.message ? err.message : 'Suppression impossible.'),
    });
  }

  const supplierName = useMemo(() => {
    const map = new Map<string, string>();
    (suppliers ?? []).forEach((s) => map.set(s.id, s.name));
    return (id?: string | null) => (id ? map.get(id) ?? '—' : '—');
  }, [suppliers]);

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
        >
          + Nouvelle dépense
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Chargement des dépenses">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger les dépenses.
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
          <p className="text-sm text-muted-foreground">Aucune dépense enregistrée.</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Enregistrer la première dépense →
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
                      col === 'Montant' || col === 'Actions' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((expense) => (
                <tr key={expense.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(expense.paidAt)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{expense.category}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {supplierName(expense.supplierId)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {EXPENSE_METHOD_LABELS[expense.method as ExpenseMethod] ?? expense.method}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {expense.reference || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {formatTnd(expense.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(expense)}
                        aria-label={`Modifier la dépense ${expense.category}`}
                        title="Modifier"
                        className="rounded p-1 text-base hover:bg-muted"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(expense)}
                        aria-label={`Supprimer la dépense ${expense.category}`}
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

      <CreateExpenseModal
        open={createOpen || editing !== null}
        expense={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
      />

      {deleting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-expense-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="del-expense-title" className="text-lg font-semibold">
              Supprimer cette dépense ?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              «&nbsp;{deleting.category}&nbsp;» ({formatTnd(deleting.amount)}) sera retirée. Si elle
              est liée à une caisse clôturée, la suppression sera refusée.
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
