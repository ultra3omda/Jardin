'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  useCreateSupplier,
  useUpdateSupplier,
  CashRegisterApiError,
  type Supplier,
} from '@/lib/api/cash-register';
import { useToast } from '@/lib/ui/use-toast';
import {
  createSupplierSchema,
  type CreateSupplierValues,
} from '@/lib/validation/cash-register.schemas';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal edits this supplier instead of creating one. */
  supplier?: Supplier | null;
}

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function CreateSupplierModal({ open, onClose, supplier }: Props) {
  const toast = useToast();
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const isEdit = !!supplier;
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSupplierValues>({
    resolver: zodResolver(createSupplierSchema),
    values: supplier
      ? {
          name: supplier.name,
          phone: supplier.phone ?? '',
          email: supplier.email ?? '',
          taxId: supplier.taxId ?? '',
        }
      : undefined,
  });

  function handleClose() {
    reset();
    onClose();
  }

  const onSubmit = handleSubmit((values) => {
    const data = {
      name: values.name,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      taxId: values.taxId?.trim() || undefined,
    };
    const onSuccess = () => {
      toast.success(isEdit ? 'Fournisseur mis à jour.' : 'Fournisseur créé.');
      handleClose();
    };
    const onError = (err: unknown) =>
      toast.error(err instanceof CashRegisterApiError ? err.message : 'Opération impossible.');

    if (supplier) {
      updateMutation.mutate({ id: supplier.id, data }, { onSuccess, onError });
    } else {
      createMutation.mutate(data, { onSuccess, onError });
    }
  });

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-supplier-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="create-supplier-title" className="text-lg font-semibold">
            {isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
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
              <label htmlFor="supplier-name" className="mb-1 block text-sm font-medium">
                Nom <span aria-hidden="true">*</span>
              </label>
              <input
                id="supplier-name"
                {...register('name')}
                placeholder="ex. Librairie El Manar"
                aria-invalid={!!errors.name}
                className={INPUT}
              />
              {errors.name && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="supplier-phone" className="mb-1 block text-sm font-medium">
                  Téléphone{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <input id="supplier-phone" {...register('phone')} className={INPUT} />
              </div>
              <div>
                <label htmlFor="supplier-email" className="mb-1 block text-sm font-medium">
                  Email{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <input
                  id="supplier-email"
                  type="email"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  className={INPUT}
                />
                {errors.email && (
                  <p role="alert" className="mt-1 text-xs text-rose-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="supplier-taxid" className="mb-1 block text-sm font-medium">
                Matricule fiscal{' '}
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <input id="supplier-taxid" {...register('taxId')} className={INPUT} />
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
              {pending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le fournisseur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
