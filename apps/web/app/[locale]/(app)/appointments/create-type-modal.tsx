'use client';

import { useState } from 'react';

import { useCreateType, AppointmentsApiError } from '@/lib/api/appointments';
import { useToast } from '@/lib/ui/use-toast';
import { createTypeSchema } from '@/lib/validation/appointments.schemas';

interface Props {
  open: boolean;
  onClose: () => void;
}

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

const DEFAULT_DURATION = 30;

export function CreateTypeModal({ open, onClose }: Props) {
  const toast = useToast();
  const createMutation = useCreateType();

  const [name, setName] = useState('');
  const [durationMin, setDurationMin] = useState<string>(String(DEFAULT_DURATION));
  const [error, setError] = useState<string | null>(null);

  function resetState() {
    setName('');
    setDurationMin(String(DEFAULT_DURATION));
    setError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleSubmit() {
    const parsed = createTypeSchema.safeParse({
      name,
      durationMin: Number(durationMin),
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Données invalides');
      return;
    }
    setError(null);
    createMutation.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('Type de rendez-vous créé.');
        handleClose();
      },
      onError: (err) =>
        toast.error(err instanceof AppointmentsApiError ? err.message : 'Création impossible.'),
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-type-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="create-type-title" className="text-lg font-semibold">
            Nouveau type de rendez-vous
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

        <div className="space-y-4 p-6">
          <div>
            <label htmlFor="type-name" className="mb-1 block text-sm font-medium">
              Nom <span aria-hidden="true">*</span>
            </label>
            <input
              id="type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Réunion pédagogique"
              className={INPUT}
            />
          </div>

          <div>
            <label htmlFor="type-duration" className="mb-1 block text-sm font-medium">
              Durée (minutes) <span aria-hidden="true">*</span>
            </label>
            <input
              id="type-duration"
              type="number"
              min={5}
              max={240}
              step={5}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className={INPUT}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Enregistrement…' : 'Créer le type'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
