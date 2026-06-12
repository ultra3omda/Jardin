'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  useCreateFeeType,
  FeesApiError,
  FEE_CATEGORY_LABELS,
  FEE_RECURRENCE_LABELS,
  type FeeCategory,
  type FeeRecurrence,
} from '@/lib/api/fees';
import { useToast } from '@/lib/ui/use-toast';
import {
  createFeeTypeSchema,
  FEE_CATEGORIES,
  FEE_RECURRENCES,
  type CreateFeeTypeValues,
} from '@/lib/validation/fees.schemas';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function CreateFeeTypeModal({ open, onClose }: Props) {
  const toast = useToast();
  const mutation = useCreateFeeType();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFeeTypeValues>({
    resolver: zodResolver(createFeeTypeSchema),
    defaultValues: {
      category: 'STANDARD',
      recurrence: 'YEARLY',
      schoolYear: CURRENT_YEAR,
      defaultAmount: 0,
    },
  });

  function handleClose() {
    reset();
    onClose();
  }

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      {
        name: values.name,
        category: values.category,
        defaultAmount: values.defaultAmount,
        recurrence: values.recurrence,
        level: values.level?.trim() || undefined,
        schoolYear: values.schoolYear,
      },
      {
        onSuccess: () => {
          toast.success('Frais créé.');
          handleClose();
        },
        onError: (err) => {
          toast.error(err instanceof FeesApiError ? err.message : 'Création impossible.');
        },
      },
    );
  });

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-fee-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="create-fee-title" className="text-lg font-semibold">
            Nouveau frais
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
            {/* Name */}
            <div>
              <label htmlFor="fee-name" className="mb-1 block text-sm font-medium">
                Nom <span aria-hidden="true">*</span>
              </label>
              <input
                id="fee-name"
                {...register('name')}
                placeholder="ex. Frais de scolarité"
                aria-invalid={!!errors.name}
                className={INPUT}
              />
              {errors.name && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Category + Recurrence */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="fee-category" className="mb-1 block text-sm font-medium">
                  Catégorie <span aria-hidden="true">*</span>
                </label>
                <select id="fee-category" {...register('category')} className={INPUT}>
                  {FEE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {FEE_CATEGORY_LABELS[c as FeeCategory]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fee-recurrence" className="mb-1 block text-sm font-medium">
                  Récurrence <span aria-hidden="true">*</span>
                </label>
                <select id="fee-recurrence" {...register('recurrence')} className={INPUT}>
                  {FEE_RECURRENCES.map((r) => (
                    <option key={r} value={r}>
                      {FEE_RECURRENCE_LABELS[r as FeeRecurrence]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount + School year */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="fee-amount" className="mb-1 block text-sm font-medium">
                  Montant par défaut (TND) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="fee-amount"
                  type="number"
                  min={0}
                  step="0.001"
                  {...register('defaultAmount')}
                  aria-invalid={!!errors.defaultAmount}
                  className={INPUT}
                />
                {errors.defaultAmount && (
                  <p role="alert" className="mt-1 text-xs text-rose-600">
                    {errors.defaultAmount.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="fee-year" className="mb-1 block text-sm font-medium">
                  Année scolaire <span aria-hidden="true">*</span>
                </label>
                <input
                  id="fee-year"
                  {...register('schoolYear')}
                  placeholder="2025-2026"
                  aria-invalid={!!errors.schoolYear}
                  className={INPUT}
                />
                {errors.schoolYear && (
                  <p role="alert" className="mt-1 text-xs text-rose-600">
                    {errors.schoolYear.message}
                  </p>
                )}
              </div>
            </div>

            {/* Level (optional) */}
            <div>
              <label htmlFor="fee-level" className="mb-1 block text-sm font-medium">
                Niveau{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <input
                id="fee-level"
                {...register('level')}
                placeholder="ex. CP, MS, 6ème…"
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
              disabled={mutation.isPending}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Enregistrement…' : 'Créer le frais'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
