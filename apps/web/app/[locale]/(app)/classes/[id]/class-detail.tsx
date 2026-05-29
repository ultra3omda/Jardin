'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Link } from '@/i18n/routing';
import { createTimeSlot, deleteTimeSlot, getClass, type TimeSlot } from '@/lib/api/classes';
import { findDemoClass } from '@/lib/demo/classes';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Props {
  id: string;
}

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
];

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 08:00 to 18:00

function hhmmToHour(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h + (m ?? 0) / 60;
}

export function ClassDetail({ id }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [slotForm, setSlotForm] = useState({
    dayOfWeek: 1,
    periodStart: '08:00',
    periodEnd: '09:00',
    subject: '',
    room: '',
  });
  const [slotError, setSlotError] = useState<string | null>(null);

  const { data: apiClass, isLoading } = useQuery({
    queryKey: ['classes', 'detail', id],
    queryFn: () => getClass(accessToken!, id),
    enabled: !!accessToken,
  });

  // Fall back to shared demo fixtures when the API errors or returns nothing,
  // so a demo list → detail click never shows "Class not found".
  const data = apiClass ?? findDemoClass(id);
  const isDemo = !apiClass && !!data;

  const addSlotMutation = useMutation({
    mutationFn: () =>
      createTimeSlot(accessToken!, id, {
        dayOfWeek: slotForm.dayOfWeek,
        periodStart: slotForm.periodStart,
        periodEnd: slotForm.periodEnd,
        subject: slotForm.subject,
        ...(slotForm.room ? { room: slotForm.room } : {}),
      }),
    onSuccess: () => {
      setShowAdd(false);
      setSlotForm({ ...slotForm, subject: '', room: '' });
      setSlotError(null);
      queryClient.invalidateQueries({ queryKey: ['classes', 'detail', id] });
    },
    onError: (e) => setSlotError(e instanceof Error ? e.message : 'CREATE_SLOT_FAILED'),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => deleteTimeSlot(accessToken!, slotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes', 'detail', id] }),
  });

  if (!accessToken) {
    return <p className="p-8 text-sm text-muted-foreground">Authentification requise.</p>;
  }
  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Chargement...</p>;
  if (!data) {
    return <p className="p-8 text-sm text-muted-foreground">Classe introuvable.</p>;
  }

  const slotsByDay: Record<number, TimeSlot[]> = {};
  for (const s of data.timeSlots ?? []) {
    (slotsByDay[s.dayOfWeek] ??= []).push(s);
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Link href="/classes" className="text-sm text-primary hover:underline">
        ← Toutes les classes
      </Link>

      <div className="mt-2 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight">{data.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Niveau {data.level} · Année {data.schoolYear}
          </p>
        </div>
        {!isDemo && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {showAdd ? 'Annuler' : '+ Créneau EDT'}
          </button>
        )}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-medium">Enseignants assignés</h2>
        {data.teachers?.length ? (
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {data.teachers.map((t) => (
              <li key={t.id}>
                {t.teacher?.firstName} {t.teacher?.lastName} — {t.subject}{' '}
                {t.isMainTeacher && <span className="text-primary">(principal)</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Aucun enseignant assigné.</p>
        )}
      </section>

      {showAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!slotForm.subject || slotForm.periodEnd <= slotForm.periodStart) {
              setSlotError('VALIDATION');
              return;
            }
            addSlotMutation.mutate();
          }}
          className="mt-6 grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-5"
        >
          <label className="block text-sm">
            Jour
            <select
              value={slotForm.dayOfWeek}
              onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: Number(e.target.value) })}
              className="mt-1 h-10 w-full rounded-md border px-2"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Début
            <input
              type="time"
              value={slotForm.periodStart}
              onChange={(e) => setSlotForm({ ...slotForm, periodStart: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border px-2"
            />
          </label>
          <label className="block text-sm">
            Fin
            <input
              type="time"
              value={slotForm.periodEnd}
              onChange={(e) => setSlotForm({ ...slotForm, periodEnd: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border px-2"
            />
          </label>
          <label className="block text-sm">
            Matière *
            <input
              value={slotForm.subject}
              onChange={(e) => setSlotForm({ ...slotForm, subject: e.target.value })}
              placeholder="Math"
              className="mt-1 h-10 w-full rounded-md border px-2"
            />
          </label>
          <label className="block text-sm">
            Salle
            <input
              value={slotForm.room}
              onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })}
              placeholder="Salle 12"
              className="mt-1 h-10 w-full rounded-md border px-2"
            />
          </label>
          {slotError && (
            <p className="col-span-full text-sm text-rose-600">Erreur : {slotError}</p>
          )}
          <div className="col-span-full">
            <button
              type="submit"
              disabled={addSlotMutation.isPending}
              className="h-10 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {addSlotMutation.isPending ? 'Ajout...' : 'Ajouter le créneau'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-medium">Emploi du temps (hebdo)</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="w-16 px-2 py-2"></th>
                {DAYS.slice(0, 6).map((d) => (
                  <th key={d.value} className="px-2 py-2 text-center">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((h) => {
                const hourLabel = `${String(h).padStart(2, '0')}:00`;
                return (
                  <tr key={h} className="border-t">
                    <td className="px-2 py-3 align-top text-xs font-mono text-muted-foreground">
                      {hourLabel}
                    </td>
                    {DAYS.slice(0, 6).map((d) => {
                      const slot = (slotsByDay[d.value] ?? []).find((s) => {
                        const sh = hhmmToHour(s.periodStart);
                        const eh = hhmmToHour(s.periodEnd);
                        return sh <= h && h < eh;
                      });
                      return (
                        <td key={d.value} className="px-1 py-1 align-top">
                          {slot && hhmmToHour(slot.periodStart) === h ? (
                            <div className="group relative rounded-md bg-primary/10 p-2 text-xs">
                              <p className="font-medium text-primary">{slot.subject}</p>
                              <p className="text-muted-foreground">
                                {slot.periodStart}–{slot.periodEnd}
                              </p>
                              {slot.room && <p className="text-muted-foreground">{slot.room}</p>}
                              {slot.teacher && (
                                <p className="text-muted-foreground">
                                  {slot.teacher.firstName?.[0] ?? ''}. {slot.teacher.lastName}
                                </p>
                              )}
                              {!isDemo && (
                                <button
                                  type="button"
                                  onClick={() => deleteMutation.mutate(slot.id)}
                                  className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded text-xs text-rose-600 hover:bg-rose-50 group-hover:flex"
                                  title="Supprimer"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
