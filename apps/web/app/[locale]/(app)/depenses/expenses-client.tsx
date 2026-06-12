'use client';

import { useMemo, useState } from 'react';

import {
  useExpenses,
  useSuppliers,
  formatTnd,
  formatDate,
  EXPENSE_METHOD_LABELS,
  type ExpenseMethod,
} from '@/lib/api/cash-register';
import { CreateExpenseModal } from './create-expense-modal';

const TABLE_COLUMNS = ['Date', 'Catégorie', 'Fournisseur', 'Méthode', 'Référence', 'Montant'];

export function ExpensesClient() {
  const { data, isLoading, isError, refetch } = useExpenses();
  const { data: suppliers } = useSuppliers();
  const [createOpen, setCreateOpen] = useState(false);

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
                      col === 'Montant' ? 'text-right' : 'text-left'
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateExpenseModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
