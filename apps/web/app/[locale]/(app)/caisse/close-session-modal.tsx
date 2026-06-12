'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  useCloseSession,
  CashRegisterApiError,
  formatTnd,
  type CloseSessionResult,
} from '@/lib/api/cash-register';
import { useToast } from '@/lib/ui/use-toast';
import {
  closeSessionSchema,
  type CloseSessionValues,
} from '@/lib/validation/cash-register.schemas';

interface Props {
  open: boolean;
  sessionId: string;
  expected: number;
  onClose: () => void;
  onClosed: (result: CloseSessionResult) => void;
}

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function CloseSessionModal({ open, sessionId, expected, onClose, onClosed }: Props) {
  const toast = useToast();
  const mutation = useCloseSession();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CloseSessionValues>({
    resolver: zodResolver(closeSessionSchema),
    defaultValues: { countedAmount: 0 },
  });

  function handleClose() {
    reset();
    onClose();
  }

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      {
        sessionId,
        data: { countedAmount: values.countedAmount, notes: values.notes?.trim() || undefined },
      },
      {
        onSuccess: (result) => {
          toast.success('Caisse clôturée.');
          reset();
          onClosed(result);
        },
        onError: (err) => {
          toast.error(
            err instanceof CashRegisterApiError ? err.message : 'Clôture impossible.',
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
      aria-labelledby="close-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="close-session-title" className="text-lg font-semibold">
            Clôturer la caisse
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
          <p className="mb-4 text-sm text-muted-foreground">
            Solde attendu&nbsp;:{' '}
            <span className="font-semibold tabular-nums text-foreground">{formatTnd(expected)}</span>
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="counted-amount" className="mb-1 block text-sm font-medium">
                Montant compté (TND) <span aria-hidden="true">*</span>
              </label>
              <input
                id="counted-amount"
                type="number"
                min={0}
                step="0.001"
                {...register('countedAmount')}
                aria-invalid={!!errors.countedAmount}
                className={INPUT}
              />
              {errors.countedAmount && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.countedAmount.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="close-notes" className="mb-1 block text-sm font-medium">
                Notes{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                id="close-notes"
                {...register('notes')}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
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
              disabled={mutation.isPending}
              className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {mutation.isPending ? 'Clôture…' : 'Clôturer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
