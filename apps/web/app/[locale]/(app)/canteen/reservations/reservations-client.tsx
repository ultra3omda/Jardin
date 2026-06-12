'use client';

import { useMemo, useState } from 'react';

import {
  useReservations,
  useReserve,
  useReserveClass,
  useSetReservationStatus,
  todayInput,
  RESERVATION_STATUS_LABELS,
  type Reservation,
  type ReservationStatus,
} from '@/lib/api/canteen-reservation';
import { useResource } from '@/lib/hooks/use-resource';
import { listClasses, type SchoolClass } from '@/lib/api/classes';
import { listStudents, type StudentSummary } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useToast } from '@/lib/ui/use-toast';

const SELECT =
  'h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

const STATUS_BADGE: Record<ReservationStatus, string> = {
  RESERVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  SERVED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
};

export function ReservationsClient() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayInput());

  const classesQuery = useResource(['canteen', 'classes'], (token) => listClasses(token));
  const studentsQuery = useResource(['canteen', 'students', classId], (token) =>
    listStudents(token, { pageSize: 500, classId: classId || undefined }),
  );

  const reservationsQuery = useReservations(
    { classId: classId || undefined, date: date || undefined },
    { enabled: !!classId && !!date },
  );

  const reserveMutation = useReserve();
  const reserveClassMutation = useReserveClass();
  const statusMutation = useSetReservationStatus();

  const classes: SchoolClass[] = classesQuery.data?.items ?? [];
  const students: StudentSummary[] = useMemo(
    () => studentsQuery.data?.items ?? [],
    [studentsQuery.data],
  );

  const reservationByStudent = useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const r of reservationsQuery.data ?? []) map.set(r.studentId, r);
    return map;
  }, [reservationsQuery.data]);

  if (!canManage) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Accès non autorisé : la gestion des réservations est réservée à la direction et au
        personnel.
      </div>
    );
  }

  function handleReserve(studentId: string) {
    reserveMutation.mutate(
      { studentId, date },
      {
        onSuccess: () => toast.success('Réservation enregistrée.'),
        onError: () => toast.error('Réservation impossible.'),
      },
    );
  }

  function handleSetStatus(reservation: Reservation, status: ReservationStatus) {
    statusMutation.mutate(
      { id: reservation.id, status },
      {
        onSuccess: () =>
          toast.success(
            status === 'CANCELLED' ? 'Réservation annulée.' : 'Statut mis à jour.',
          ),
        onError: () => toast.error('Action impossible.'),
      },
    );
  }

  function handleReserveClass() {
    if (!classId) return;
    reserveClassMutation.mutate(
      { classId, date },
      {
        onSuccess: (res) =>
          toast.success(
            `${res.created} réservation(s) ajoutée(s) sur ${res.total} élève(s).`,
          ),
        onError: () => toast.error('Réservation de classe impossible.'),
      },
    );
  }

  const showStudents = !!classId && !!date;
  const isBusy = reserveMutation.isPending || statusMutation.isPending;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="res-class"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Classe
            </label>
            <select
              id="res-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={SELECT}
            >
              <option value="">Sélectionner une classe…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="res-date"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Date
            </label>
            <input
              id="res-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={SELECT}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleReserveClass}
          disabled={!showStudents || reserveClassMutation.isPending || students.length === 0}
          className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
        >
          {reserveClassMutation.isPending ? 'Réservation…' : 'Réserver toute la classe'}
        </button>
      </div>

      {!showStudents ? (
        <div className="mt-6 rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Sélectionnez une classe et une date pour gérer les réservations.
          </p>
        </div>
      ) : studentsQuery.isLoading || reservationsQuery.isLoading ? (
        <div className="mt-6 space-y-2" role="status" aria-label="Chargement des élèves">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : studentsQuery.isError || reservationsQuery.isError ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            Impossible de charger les réservations.
          </p>
          <button
            type="button"
            onClick={() => {
              studentsQuery.refetch();
              reservationsQuery.refetch();
            }}
            className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            Réessayer
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucun élève dans cette classe.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Élève
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Statut
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => {
                const reservation = reservationByStudent.get(s.id);
                const isReserved = reservation?.status === 'RESERVED';
                return (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="px-4 py-3">
                      {reservation ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[reservation.status]}`}
                        >
                          {RESERVATION_STATUS_LABELS[reservation.status]}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Non réservé</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isReserved && reservation ? (
                        <button
                          type="button"
                          onClick={() => handleSetStatus(reservation, 'CANCELLED')}
                          disabled={isBusy}
                          className="h-9 rounded-md border border-rose-200 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/10"
                        >
                          Annuler
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReserve(s.id)}
                          disabled={isBusy}
                          className="h-9 rounded-md bg-navy-700 px-3 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
                        >
                          Réserver
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
