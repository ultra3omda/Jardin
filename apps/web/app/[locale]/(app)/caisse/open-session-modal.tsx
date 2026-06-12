'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useOpenSession, CashRegisterApiError } from '@/lib/api/cash-register';
import { useToast } from '@/lib/ui/use-toast';
import { openSessionSchema, type OpenSessionValues } from '@/lib/validation/cash-register.schemas';

interface Props {
  open: boolean;
  onClose: () => void;
}

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function OpenSessionModal({ open, onClose }: Props) {
  const toast = useToast();
  const mutation = useOpenSession();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpenSessionValues>({
    resolver: zodResolver(openSessionSchema),
    defaultValues: { openingFloat: 0 },
  });

  function handleClose() {
    reset();
    onClose();
  }

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      {
        openingFloat: values.openingFloat,
        notes: values.notes?.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Caisse ouverte.');
          handleClose();
        },
        onError: (err) => {
          toast.error(
            err instanceof CashRegisterApiError ? err.message : 'Ouverture impossible.',
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
      aria-labelledby="open-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="open-session-title" className="text-lg font-semibold">
            Ouvrir la caisse
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
              <label htmlFor="opening-float" className="mb-1 block text-sm font-medium">
                Fond de caisse (TND) <span aria-hidden="true">*</span>
              </label>
              <input
                id="opening-float"
                type="number"
                min={0}
                step="0.001"
                {...register('openingFloat')}
                aria-invalid={!!errors.openingFloat}
                className={INPUT}
              />
              {errors.openingFloat && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.openingFloat.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="opening-notes" className="mb-1 block text-sm font-medium">
                Notes{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                id="opening-notes"
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
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Ouverture…' : 'Ouvrir la caisse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
