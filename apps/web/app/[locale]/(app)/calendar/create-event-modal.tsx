'use client';

import { useState } from 'react';

import {
  useCreateEvent,
  CalendarApiError,
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS,
  type CalendarEventType,
} from '@/lib/api/calendar';
import { createEventSchema } from '@/lib/validation/calendar.schemas';
import { useToast } from '@/lib/ui/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultSchoolYear: string;
}

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';
const TEXTAREA =
  'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function CreateEventModal({ open, onClose, defaultSchoolYear }: Props) {
  const toast = useToast();
  const createMutation = useCreateEvent();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<CalendarEventType>('EVENT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [schoolYear, setSchoolYear] = useState(defaultSchoolYear);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function resetState() {
    setTitle('');
    setType('EVENT');
    setStartDate('');
    setEndDate('');
    setSchoolYear(defaultSchoolYear);
    setNotes('');
    setError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleSubmit() {
    const parsed = createEventSchema.safeParse({
      title,
      type,
      startDate,
      endDate,
      schoolYear,
      notes: notes.trim() ? notes.trim() : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Formulaire invalide.');
      return;
    }
    setError(null);
    createMutation.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('Événement créé.');
        handleClose();
      },
      onError: (err) =>
        toast.error(err instanceof CalendarApiError ? err.message : 'Création impossible.'),
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="create-event-title" className="text-lg font-semibold">
            Nouvel événement
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

        <div className="overflow-y-auto p-6" style={{ maxHeight: '75vh' }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="event-title" className="mb-1 block text-sm font-medium">
                Titre <span aria-hidden="true">*</span>
              </label>
              <input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex. Vacances d'hiver"
                className={INPUT}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="event-type" className="mb-1 block text-sm font-medium">
                  Type <span aria-hidden="true">*</span>
                </label>
                <select
                  id="event-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as CalendarEventType)}
                  className={INPUT}
                >
                  {CALENDAR_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CALENDAR_EVENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="event-year" className="mb-1 block text-sm font-medium">
                  Année scolaire <span aria-hidden="true">*</span>
                </label>
                <input
                  id="event-year"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  placeholder="2025-2026"
                  className={INPUT}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="event-start" className="mb-1 block text-sm font-medium">
                  Début <span aria-hidden="true">*</span>
                </label>
                <input
                  id="event-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor="event-end" className="mb-1 block text-sm font-medium">
                  Fin <span aria-hidden="true">*</span>
                </label>
                <input
                  id="event-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label htmlFor="event-notes" className="mb-1 block text-sm font-medium">
                Notes <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                id="event-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Précisions sur l'événement…"
                className={TEXTAREA}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-rose-600">
                {error}
              </p>
            )}
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
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Enregistrement…' : "Créer l'événement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
