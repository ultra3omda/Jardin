'use client';

import { useMemo, useState } from 'react';

import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useToast } from '@/lib/ui/use-toast';
import {
  useCalendar,
  useDeleteEvent,
  CalendarApiError,
  CALENDAR_EVENT_TYPE_LABELS,
  formatEventRange,
  type CalendarEvent,
  type CalendarEventType,
} from '@/lib/api/calendar';
import { CreateEventModal } from './create-event-modal';

const TYPE_BADGE: Record<CalendarEventType, string> = {
  VACATION: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  HOLIDAY: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  EVENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  EXAM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  MEETING: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200',
};

/** Derive the current school year label (e.g. "2025-2026") from today's date. */
function currentSchoolYear(): string {
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

export function CalendarClient() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  const [schoolYear, setSchoolYear] = useState<string>(currentSchoolYear());
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const query = useCalendar(schoolYear);
  const deleteMutation = useDeleteEvent();

  const events = useMemo(() => {
    const list = query.data ?? [];
    return [...list].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  }, [query.data]);

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Événement supprimé.');
        setDeleteTarget(null);
      },
      onError: (err) =>
        toast.error(err instanceof CalendarApiError ? err.message : 'Suppression impossible.'),
    });
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor="cal-year" className="mb-1 block text-sm font-medium">
            Année scolaire
          </label>
          <input
            id="cal-year"
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            placeholder="2025-2026"
            className="h-10 w-44 rounded-md border px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
          >
            + Nouvel événement
          </button>
        )}
      </div>

      {/* Agenda */}
      {query.isLoading ? (
        <div className="space-y-2" role="status" aria-label="Chargement du calendrier">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger le calendrier.
          </p>
          <button
            type="button"
            onClick={query.refetch}
            className="mt-3 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            Réessayer
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun événement pour l&apos;année {schoolYear}.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"
            >
              <span
                className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[ev.type]}`}
              >
                {CALENDAR_EVENT_TYPE_LABELS[ev.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy-900 dark:text-white">{ev.title}</p>
                {ev.notes && (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{ev.notes}</p>
                )}
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {formatEventRange(ev.startDate, ev.endDate)}
              </span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(ev)}
                  className="shrink-0 rounded px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/20"
                >
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultSchoolYear={schoolYear}
      />

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cal-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="cal-delete-title" className="mb-2 text-lg font-semibold">
              Supprimer l&apos;événement
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Voulez-vous vraiment supprimer{' '}
              <strong>&quot;{deleteTarget.title}&quot;</strong> ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
