'use client';

import { useMemo, useState } from 'react';

import {
  useAppointmentTypes,
  useAvailableSlots,
  useStaffAppointments,
  useSetAppointmentStatus,
  formatSlot,
  APPOINTMENT_STATUS_LABELS,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/api/appointments';
import { useResource } from '@/lib/hooks/use-resource';
import { listStudents } from '@/lib/api/students';
import { listStaff, listParents, type StaffUser } from '@/lib/api/staff';
import { useToast } from '@/lib/ui/use-toast';
import { CreateTypeModal } from './create-type-modal';
import { CreateSlotModal } from './create-slot-modal';

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  CANCELLED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  COMPLETED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  NO_SHOW: 'bg-slate-100 text-slate-800 dark:bg-navy-900/40 dark:text-slate-200',
};

const APPT_COLUMNS = ['Parent', 'Élève', 'Type', 'Créneau', 'Statut', 'Actions'];

interface RowAction {
  status: AppointmentStatus;
  label: string;
  className: string;
}

/** Actions available per appointment row, depending on its current status. */
function actionsFor(status: AppointmentStatus): RowAction[] {
  const confirm: RowAction = {
    status: 'CONFIRMED',
    label: 'Confirmer',
    className: 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/20',
  };
  const cancel: RowAction = {
    status: 'CANCELLED',
    label: 'Annuler',
    className: 'text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/20',
  };
  const complete: RowAction = {
    status: 'COMPLETED',
    label: 'Terminé',
    className: 'text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-900/20',
  };
  const noShow: RowAction = {
    status: 'NO_SHOW',
    label: 'Absent',
    className: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
  };

  switch (status) {
    case 'REQUESTED':
      return [confirm, cancel];
    case 'CONFIRMED':
      return [complete, noShow, cancel];
    default:
      return [];
  }
}

function fullName(u: StaffUser): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.email;
}

export function AppointmentsClient() {
  const toast = useToast();

  const typesQuery = useAppointmentTypes();
  const slotsQuery = useAvailableSlots();
  const apptsQuery = useStaffAppointments();
  const setStatus = useSetAppointmentStatus();

  const staffQuery = useResource(['appointments', 'staff'], (token) => listStaff(token));
  const parentsQuery = useResource(['appointments', 'parents'], (token) => listParents(token));
  const studentsQuery = useResource(['appointments', 'students'], (token) =>
    listStudents(token, { pageSize: 500 }),
  );

  const staff: StaffUser[] = useMemo(() => staffQuery.data?.items ?? [], [staffQuery.data]);

  const staffNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of staff) map.set(u.id, fullName(u));
    return map;
  }, [staff]);

  const parentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of parentsQuery.data?.items ?? []) map.set(u.id, fullName(u));
    return map;
  }, [parentsQuery.data]);

  const studentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of studentsQuery.data?.items ?? []) {
      map.set(s.id, `${s.firstName} ${s.lastName}`);
    }
    return map;
  }, [studentsQuery.data]);

  const [typeOpen, setTypeOpen] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);

  function changeStatus(appt: Appointment, status: AppointmentStatus) {
    setStatus.mutate(
      { id: appt.id, status },
      {
        onSuccess: () => toast.success(`Rendez-vous : ${APPOINTMENT_STATUS_LABELS[status].toLowerCase()}.`),
        onError: () => toast.error('Action impossible.'),
      },
    );
  }

  const types = typesQuery.data ?? [];
  const slots = slotsQuery.data ?? [];
  const appointments = apptsQuery.data ?? [];

  return (
    <div className="space-y-8">
      {/* ── Types section ───────────────────────────────────────────── */}
      <section aria-labelledby="types-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="types-heading" className="text-lg font-semibold">
            Types de rendez-vous
          </h2>
          <button
            type="button"
            onClick={() => setTypeOpen(true)}
            className="inline-flex h-9 items-center rounded-md bg-navy-700 px-3 text-sm font-semibold text-white hover:bg-navy-600"
          >
            + Nouveau type
          </button>
        </div>
        {typesQuery.isLoading ? (
          <div className="space-y-2" role="status" aria-label="Chargement des types">
            {[0, 1].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : typesQuery.isError ? (
          <ErrorBox label="Impossible de charger les types." onRetry={typesQuery.refetch} />
        ) : types.length === 0 ? (
          <EmptyBox text="Aucun type pour l'instant." />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {types.map((t) => (
              <li
                key={t.id}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  t.active ? 'bg-card' : 'bg-muted/40 text-muted-foreground'
                }`}
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{t.durationMin} min</span>
                {!t.active && <span className="text-xs">(inactif)</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Available slots section ─────────────────────────────────── */}
      <section aria-labelledby="slots-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="slots-heading" className="text-lg font-semibold">
            Créneaux disponibles
          </h2>
          <button
            type="button"
            onClick={() => setSlotOpen(true)}
            className="inline-flex h-9 items-center rounded-md bg-navy-700 px-3 text-sm font-semibold text-white hover:bg-navy-600"
          >
            + Nouveau créneau
          </button>
        </div>
        {slotsQuery.isLoading ? (
          <div className="space-y-2" role="status" aria-label="Chargement des créneaux">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : slotsQuery.isError ? (
          <ErrorBox label="Impossible de charger les créneaux." onRetry={slotsQuery.refetch} />
        ) : slots.length === 0 ? (
          <EmptyBox text="Aucun créneau disponible. Créez-en un pour permettre aux parents de réserver." />
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((s) => (
              <li key={s.id} className="rounded-lg border bg-card p-3">
                <p className="text-sm font-medium tabular-nums">{formatSlot(s.startsAt)}</p>
                <p className="text-xs text-muted-foreground">
                  {staffNameById.get(s.staffUserId) ?? s.staffUserId}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.isBooked
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                  }`}
                >
                  {s.isBooked ? 'Réservé' : 'Libre'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Appointments section ────────────────────────────────────── */}
      <section aria-labelledby="appts-heading" className="space-y-3">
        <h2 id="appts-heading" className="text-lg font-semibold">
          Rendez-vous
        </h2>
        {apptsQuery.isLoading ? (
          <div className="space-y-2" role="status" aria-label="Chargement des rendez-vous">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : apptsQuery.isError ? (
          <ErrorBox label="Impossible de charger les rendez-vous." onRetry={apptsQuery.refetch} />
        ) : appointments.length === 0 ? (
          <EmptyBox text="Aucun rendez-vous pour l'instant." />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  {APPT_COLUMNS.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                        col === 'Actions' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {appointments.map((appt) => {
                  const typeName = types.find((t) => t.id === appt.typeId)?.name ?? '—';
                  const rowActions = actionsFor(appt.status);
                  return (
                    <tr key={appt.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">
                        {parentNameById.get(appt.parentUserId) ?? appt.parentUserId}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {studentNameById.get(appt.studentId) ?? appt.studentId}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{typeName}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                        {formatSlot(appt.slot.startsAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[appt.status]}`}
                        >
                          {APPOINTMENT_STATUS_LABELS[appt.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {rowActions.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {rowActions.map((a) => (
                              <button
                                key={a.status}
                                type="button"
                                onClick={() => changeStatus(appt, a.status)}
                                disabled={setStatus.isPending}
                                className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${a.className}`}
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CreateTypeModal open={typeOpen} onClose={() => setTypeOpen(false)} />
      <CreateSlotModal open={slotOpen} onClose={() => setSlotOpen(false)} staff={staff} />
    </div>
  );
}

function ErrorBox({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
      <p className="text-sm text-rose-700 dark:text-rose-300">{label}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
      >
        Réessayer
      </button>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
