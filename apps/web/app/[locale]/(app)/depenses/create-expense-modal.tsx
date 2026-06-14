'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  useCreateExpense,
  useUpdateExpense,
  useSuppliers,
  CashRegisterApiError,
  EXPENSE_METHOD_LABELS,
  type ExpenseMethod,
  type Expense,
} from '@/lib/api/cash-register';
import { useToast } from '@/lib/ui/use-toast';
import {
  createExpenseSchema,
  EXPENSE_METHODS,
  type CreateExpenseValues,
} from '@/lib/validation/cash-register.schemas';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided, edits this expense (metadata only — amount/method locked). */
  expense?: Expense | null;
}

const TODAY = new Date().toISOString().slice(0, 10);
const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function CreateExpenseModal({ open, onClose, expense }: Props) {
  const toast = useToast();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const { data: suppliers } = useSuppliers();
  const isEdit = !!expense;
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateExpenseValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: { method: 'cash', paidAt: TODAY },
    values: expense
      ? {
          category: expense.category,
          amount: expense.amount,
          paidAt: expense.paidAt.slice(0, 10),
          method: expense.method,
          supplierId: expense.supplierId ?? '',
          reference: expense.reference ?? '',
        }
      : undefined,
  });

  function handleClose() {
    reset();
    onClose();
  }

  const onSubmit = handleSubmit((values) => {
    const onSuccess = () => {
      toast.success(isEdit ? 'Dépense mise à jour.' : 'Dépense enregistrée.');
      handleClose();
    };
    const onError = (err: unknown) =>
      toast.error(err instanceof CashRegisterApiError ? err.message : 'Opération impossible.');

    if (expense) {
      // Édition : métadonnées seulement (amount/method verrouillés côté API).
      updateMutation.mutate(
        {
          id: expense.id,
          data: {
            category: values.category,
            paidAt: new Date(values.paidAt).toISOString(),
            supplierId: values.supplierId?.trim() || undefined,
            reference: values.reference?.trim() || undefined,
          },
        },
        { onSuccess, onError },
      );
      return;
    }

    createMutation.mutate(
      {
        category: values.category,
        amount: values.amount,
        paidAt: new Date(values.paidAt).toISOString(),
        method: values.method,
        supplierId: values.supplierId?.trim() || undefined,
        reference: values.reference?.trim() || undefined,
      },
      { onSuccess, onError },
    );
  });

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-expense-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="create-expense-title" className="text-lg font-semibold">
            {isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer la modale"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="overflow-y-auto p-6" style={{ maxHeight: '75vh' }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="expense-category" className="mb-1 block text-sm font-medium">
                Catégorie <span aria-hidden="true">*</span>
              </label>
              <input
                id="expense-category"
                {...register('category')}
                placeholder="ex. Fournitures, Maintenance…"
                aria-invalid={!!errors.category}
                className={INPUT}
              />
              {errors.category && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.category.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="expense-amount" className="mb-1 block text-sm font-medium">
                  Montant (TND) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  min={0}
                  step="0.001"
                  {...register('amount')}
                  aria-invalid={!!errors.amount}
                  disabled={isEdit}
                  className={`${INPUT} disabled:cursor-not-allowed disabled:opacity-60`}
                />
                {isEdit ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Non modifiable (lié à la caisse).
                  </p>
                ) : null}
                {errors.amount && (
                  <p role="alert" className="mt-1 text-xs text-rose-600">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="expense-date" className="mb-1 block text-sm font-medium">
                  Date <span aria-hidden="true">*</span>
                </label>
                <input
                  id="expense-date"
                  type="date"
                  {...register('paidAt')}
                  aria-invalid={!!errors.paidAt}
                  className={INPUT}
                />
                {errors.paidAt && (
                  <p role="alert" className="mt-1 text-xs text-rose-600">
                    {errors.paidAt.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="expense-method" className="mb-1 block text-sm font-medium">
                  Méthode <span aria-hidden="true">*</span>
                </label>
                <select
                  id="expense-method"
                  {...register('method')}
                  disabled={isEdit}
                  className={`${INPUT} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {EXPENSE_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {EXPENSE_METHOD_LABELS[m as ExpenseMethod]}
                    </option>
                  ))}
                </select>
                {isEdit ? (
                  <p className="mt-1 text-xs text-muted-foreground">Non modifiable.</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="expense-supplier" className="mb-1 block text-sm font-medium">
                  Fournisseur{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <select id="expense-supplier" {...register('supplierId')} className={INPUT}>
                  <option value="">— Aucun —</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="expense-reference" className="mb-1 block text-sm font-medium">
                Référence{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <input
                id="expense-reference"
                {...register('reference')}
                placeholder="ex. N° chèque, bon de commande…"
                className={INPUT}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {pending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Enregistrer la dépense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
