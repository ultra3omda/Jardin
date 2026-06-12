'use client';

import { useState } from 'react';

import { useCreateSlot, AppointmentsApiError } from '@/lib/api/appointments';
import type { StaffUser } from '@/lib/api/staff';
import { useToast } from '@/lib/ui/use-toast';
import { createSlotSchema } from '@/lib/validation/appointments.schemas';

interface Props {
  open: boolean;
  onClose: () => void;
  staff: StaffUser[];
}

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateSlotModal({ open, onClose, staff }: Props) {
  const toast = useToast();
  const createMutation = useCreateSlot();

  const [staffUserId, setStaffUserId] = useState('');
  const [startsAt, setStartsAt] = useState(nowLocalInput());
  const [endsAt, setEndsAt] = useState(nowLocalInput());
  const [error, setError] = useState<string | null>(null);

  function resetState() {
    setStaffUserId('');
    setStartsAt(nowLocalInput());
    setEndsAt(nowLocalInput());
    setError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleSubmit() {
    const parsed = createSlotSchema.safeParse({ staffUserId, startsAt, endsAt });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Données invalides');
      return;
    }
    setError(null);
    createMutation.mutate(
      {
        staffUserId: parsed.data.staffUserId,
        startsAt: new Date(parsed.data.startsAt).toISOString(),
        endsAt: new Date(parsed.data.endsAt).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success('Créneau créé.');
          handleClose();
        },
        onError: (err) =>
          toast.error(err instanceof AppointmentsApiError ? err.message : 'Création impossible.'),
      },
    );
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-slot-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="create-slot-title" className="text-lg font-semibold">
            Nouveau créneau
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
            <label htmlFor="slot-staff" className="mb-1 block text-sm font-medium">
              Membre de l&apos;équipe <span aria-hidden="true">*</span>
            </label>
            <select
              id="slot-staff"
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
              className={INPUT}
            >
              <option value="">Sélectionner un membre…</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {`${u.firstName} ${u.lastName}`.trim() || u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="slot-start" className="mb-1 block text-sm font-medium">
                Début <span aria-hidden="true">*</span>
              </label>
              <input
                id="slot-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="slot-end" className="mb-1 block text-sm font-medium">
                Fin <span aria-hidden="true">*</span>
              </label>
              <input
                id="slot-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          {staff.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aucun membre disponible. Vérifiez l&apos;annuaire de l&apos;équipe.
            </p>
          )}

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
              {createMutation.isPending ? 'Enregistrement…' : 'Créer le créneau'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
