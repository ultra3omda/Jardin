'use client';

import { useMemo, useState } from 'react';

import {
  useAppointmentTypes,
  useAvailableSlots,
  useMyAppointments,
  useBookAppointment,
  formatSlot,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentSlot,
  type AppointmentStatus,
} from '@/lib/api/appointments';
import { useResource } from '@/lib/hooks/use-resource';
import { getMyChildren } from '@/lib/api/students';
import { useToast } from '@/lib/ui/use-toast';

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  CANCELLED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  COMPLETED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  NO_SHOW: 'bg-slate-100 text-slate-800 dark:bg-navy-900/40 dark:text-slate-200',
};

/** Parent view of /appointments: book a free slot + see my appointments. */
export function ParentAppointmentsClient() {
  const toast = useToast();
  const typesQuery = useAppointmentTypes();
  const slotsQuery = useAvailableSlots();
  const mineQuery = useMyAppointments();
  const childrenQuery = useResource(['my-children'], (token) => getMyChildren(token));
  const bookMutation = useBookAppointment();

  const [slot, setSlot] = useState<AppointmentSlot | null>(null);
  const [typeId, setTypeId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [note, setNote] = useState('');

  const types = useMemo(() => typesQuery.data ?? [], [typesQuery.data]);
  const freeSlots = useMemo(
    () => (slotsQuery.data ?? []).filter((s) => !s.isBooked),
    [slotsQuery.data],
  );
  const children = childrenQuery.data ?? [];
  const mine = mineQuery.data ?? [];

  function openBooking(s: AppointmentSlot) {
    setSlot(s);
    setTypeId(types[0]?.id ?? '');
    setStudentId('');
    setNote('');
  }

  function confirmBooking() {
    if (!slot) return;
    if (!typeId) {
      toast.error('Choisissez un motif de rendez-vous.');
      return;
    }
    bookMutation.mutate(
      {
        slotId: slot.id,
        typeId,
        studentId: studentId || undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Rendez-vous réservé.');
          setSlot(null);
        },
        onError: (err) =>
          toast.error(
            err instanceof Error && err.message
              ? err.message
              : 'Réservation impossible (créneau peut-être déjà pris).',
          ),
      },
    );
  }

  return (
    <div className="space-y-8">
      {/* Mes rendez-vous */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Mes rendez-vous</h2>
        {mineQuery.isLoading ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : mine.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            Aucun rendez-vous pour l&apos;instant. Réservez un créneau ci-dessous.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
            {mine.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm">
                  <span className="font-medium">{formatSlot(a.slot.startsAt)}</span>
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status]}`}
                >
                  {APPOINTMENT_STATUS_LABELS[a.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Créneaux disponibles */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Créneaux disponibles</h2>
        {slotsQuery.isLoading ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : freeSlots.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            Aucun créneau disponible pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
            {freeSlots.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-medium">{formatSlot(s.startsAt)}</span>
                <button
                  type="button"
                  onClick={() => openBooking(s)}
                  className="h-9 rounded-md bg-navy-700 px-3 text-sm font-semibold text-white hover:bg-navy-600"
                >
                  Réserver
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Booking modal */}
      {slot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="book-title" className="text-lg font-semibold">
              Réserver un rendez-vous
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{formatSlot(slot.startsAt)}</p>

            <label htmlFor="book-type" className="mb-1 mt-4 block text-sm font-medium">
              Motif <span aria-hidden="true">*</span>
            </label>
            <select
              id="book-type"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="">Sélectionner…</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.durationMin} min)
                </option>
              ))}
            </select>

            {children.length > 0 && (
              <>
                <label htmlFor="book-child" className="mb-1 mt-4 block text-sm font-medium">
                  Enfant concerné{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <select
                  id="book-child"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                >
                  <option value="">—</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label htmlFor="book-note" className="mb-1 mt-4 block text-sm font-medium">
              Note <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
            </label>
            <textarea
              id="book-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSlot(null)}
                className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmBooking}
                disabled={bookMutation.isPending}
                className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
              >
                {bookMutation.isPending ? 'Réservation…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
