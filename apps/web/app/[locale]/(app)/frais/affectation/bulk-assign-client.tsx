'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useBulkAssignFees, useFeeTypes, FeesApiError, formatTnd } from '@/lib/api/fees';
import { listClasses, type SchoolClass } from '@/lib/api/classes';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { bulkAssignSchema, type BulkAssignValues } from '@/lib/validation/fees.schemas';

const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function BulkAssignClient() {
  const toast = useToast();
  const feeTypesQuery = useFeeTypes();
  const classesQuery = useResource<{ items: SchoolClass[]; total: number }>(
    ['classes', 'fee-assign-options'],
    (token) => listClasses(token),
  );
  const mutation = useBulkAssignFees();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BulkAssignValues>({
    resolver: zodResolver(bulkAssignSchema),
    defaultValues: {
      target: 'class',
      schoolYear: CURRENT_YEAR,
      installments: 1,
    },
  });

  const target = watch('target');
  const activeFeeTypes = (feeTypesQuery.data ?? []).filter((f) => f.active);
  const classes = classesQuery.data?.items ?? [];

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      {
        feeTypeId: values.feeTypeId,
        classId: values.target === 'class' ? values.classId : undefined,
        level: values.target === 'level' ? values.level?.trim() : undefined,
        schoolYear: values.schoolYear,
        amount: values.amount,
        advanceAmount: values.advanceAmount,
        installments: values.installments,
      },
      {
        onSuccess: (res) => {
          toast.success(`${res.created} créés / ${res.skipped} ignorés`);
          reset({
            target: values.target,
            schoolYear: values.schoolYear,
            installments: 1,
            feeTypeId: '',
          });
        },
        onError: (err) => {
          toast.error(err instanceof FeesApiError ? err.message : 'Affectation impossible.');
        },
      },
    );
  });

  return (
    <div className="max-w-2xl rounded-xl border bg-card p-6">
      {feeTypesQuery.isLoading ? (
        <div className="space-y-3" role="status" aria-label="Chargement du formulaire">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : feeTypesQuery.isError ? (
        <div className="text-center">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger les frais.
          </p>
          <button
            type="button"
            onClick={() => feeTypesQuery.refetch()}
            className="mt-3 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            Réessayer
          </button>
        </div>
      ) : activeFeeTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun frais actif. Créez d&apos;abord un frais dans le référentiel.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Fee type */}
          <div>
            <label htmlFor="ba-fee" className="mb-1 block text-sm font-medium">
              Frais à affecter <span aria-hidden="true">*</span>
            </label>
            <select
              id="ba-fee"
              {...register('feeTypeId')}
              aria-invalid={!!errors.feeTypeId}
              className={INPUT}
            >
              <option value="">— Sélectionner un frais —</option>
              {activeFeeTypes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({formatTnd(f.defaultAmount)})
                </option>
              ))}
            </select>
            {errors.feeTypeId && (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.feeTypeId.message}
              </p>
            )}
          </div>

          {/* Target type */}
          <fieldset>
            <legend className="mb-1 block text-sm font-medium">Cible</legend>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" value="class" {...register('target')} /> Une classe
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" value="level" {...register('target')} /> Un niveau
              </label>
            </div>
          </fieldset>

          {/* Class or level */}
          {target === 'class' ? (
            <div>
              <label htmlFor="ba-class" className="mb-1 block text-sm font-medium">
                Classe <span aria-hidden="true">*</span>
              </label>
              <select
                id="ba-class"
                {...register('classId')}
                aria-invalid={!!errors.classId}
                className={INPUT}
              >
                <option value="">— Sélectionner une classe —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.level} · {c.schoolYear}
                  </option>
                ))}
              </select>
              {errors.classId && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.classId.message}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="ba-level" className="mb-1 block text-sm font-medium">
                Niveau <span aria-hidden="true">*</span>
              </label>
              <input
                id="ba-level"
                {...register('level')}
                placeholder="ex. CP, MS, 6ème…"
                aria-invalid={!!errors.level}
                className={INPUT}
              />
              {errors.level && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.level.message}
                </p>
              )}
            </div>
          )}

          {/* School year + installments */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ba-year" className="mb-1 block text-sm font-medium">
                Année scolaire <span aria-hidden="true">*</span>
              </label>
              <input
                id="ba-year"
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
            <div>
              <label htmlFor="ba-installments" className="mb-1 block text-sm font-medium">
                Échéances (1-12) <span aria-hidden="true">*</span>
              </label>
              <input
                id="ba-installments"
                type="number"
                min={1}
                max={12}
                {...register('installments')}
                aria-invalid={!!errors.installments}
                className={INPUT}
              />
              {errors.installments && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.installments.message}
                </p>
              )}
            </div>
          </div>

          {/* Optional amount + advance */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ba-amount" className="mb-1 block text-sm font-medium">
                Montant{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (remplace le défaut)
                </span>
              </label>
              <input
                id="ba-amount"
                type="number"
                min={0}
                step="0.001"
                {...register('amount')}
                placeholder="Optionnel"
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="ba-advance" className="mb-1 block text-sm font-medium">
                Avance{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <input
                id="ba-advance"
                type="number"
                min={0}
                step="0.001"
                {...register('advanceAmount')}
                placeholder="Optionnel"
                className={INPUT}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Affectation…' : 'Affecter le frais'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
