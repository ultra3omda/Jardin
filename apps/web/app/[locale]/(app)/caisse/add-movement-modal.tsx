'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  useAddMovement,
  CashRegisterApiError,
  MOVEMENT_KIND_LABELS,
  type MovementKind,
} from '@/lib/api/cash-register';
import { useToast } from '@/lib/ui/use-toast';
import {
  addMovementSchema,
  MOVEMENT_KINDS,
  type AddMovementValues,
} from '@/lib/validation/cash-register.schemas';

interface Props {
  open: boolean;
  sessionId: string;
  onClose: () => void;
}

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function AddMovementModal({ open, sessionId, onClose }: Props) {
  const toast = useToast();
  const mutation = useAddMovement();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddMovementValues>({
    resolver: zodResolver(addMovementSchema),
    defaultValues: { kind: 'INCOME' },
  });

  function handleClose() {
    reset();
    onClose();
  }

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      {
        sessionId,
        data: { kind: values.kind, amount: values.amount, label: values.label },
      },
      {
        onSuccess: () => {
          toast.success('Mouvement enregistré.');
          handleClose();
        },
        onError: (err) => {
          toast.error(
            err instanceof CashRegisterApiError ? err.message : 'Enregistrement impossible.',
          );
        },
      },
    );
  });

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-movement-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="add-movement-title" className="text-lg font-semibold">
            Ajouter un mouvement
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

        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="movement-kind" className="mb-1 block text-sm font-medium">
                Type <span aria-hidden="true">*</span>
              </label>
              <select id="movement-kind" {...register('kind')} className={INPUT}>
                {MOVEMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {MOVEMENT_KIND_LABELS[k as MovementKind]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="movement-amount" className="mb-1 block text-sm font-medium">
                Montant (TND) <span aria-hidden="true">*</span>
              </label>
              <input
                id="movement-amount"
                type="number"
                min={0}
                step="0.001"
                {...register('amount')}
                aria-invalid={!!errors.amount}
                className={INPUT}
              />
              {errors.amount && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="movement-label" className="mb-1 block text-sm font-medium">
                Libellé <span aria-hidden="true">*</span>
              </label>
              <input
                id="movement-label"
                {...register('label')}
                placeholder="ex. Paiement scolarité élève"
                aria-invalid={!!errors.label}
                className={INPUT}
              />
              {errors.label && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.label.message}
                </p>
              )}
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
              disabled={mutation.isPending}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
