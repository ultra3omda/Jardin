'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Link } from '@/i18n/routing';
import {
  assignTeacher,
  createTimeSlot,
  deleteTimeSlot,
  getClass,
  removeClassTeacher,
  type TimeSlot,
} from '@/lib/api/classes';
import { listTeachers } from '@/lib/api/staff';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Props {
  id: string;
}

interface SubjectOption {
  id: string;
  name: string;
  emoji?: string | null;
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
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [slotForm, setSlotForm] = useState({
    dayOfWeek: 1,
    periodStart: '08:00',
    periodEnd: '09:00',
    subject: '',
    teacherUserId: '',
    room: '',
  });
  const [slotError, setSlotError] = useState<string | null>(null);

  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ teacherUserId: '', subject: '', isMainTeacher: false });
  const [assignError, setAssignError] = useState<string | null>(null);

  const { data: apiClass, isLoading } = useQuery({
    queryKey: ['classes', 'detail', id],
    queryFn: () => getClass(accessToken!, id),
    enabled: !!accessToken,
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers', 'all'],
    queryFn: () => listTeachers(accessToken!),
    enabled: !!accessToken && canManage,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/subjects', { headers: { Authorization: `Bearer ${accessToken!}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { items: SubjectOption[] };
    },
    enabled: !!accessToken,
  });

  const teachers = (teachersData?.items ?? []).filter((t) => !t.deletedAt);
  const subjects = subjectsData?.items ?? [];

  const data = apiClass;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['classes', 'detail', id] });

  const addSlotMutation = useMutation({
    mutationFn: () =>
      createTimeSlot(accessToken!, id, {
        dayOfWeek: slotForm.dayOfWeek,
        periodStart: slotForm.periodStart,
        periodEnd: slotForm.periodEnd,
        subject: slotForm.subject,
        ...(slotForm.teacherUserId ? { teacherUserId: slotForm.teacherUserId } : {}),
        ...(slotForm.room ? { room: slotForm.room } : {}),
      }),
    onSuccess: () => {
      setShowAdd(false);
      setSlotForm({ ...slotForm, subject: '', teacherUserId: '', room: '' });
      setSlotError(null);
      invalidate();
    },
    onError: (e) => setSlotError(e instanceof Error ? e.message : 'CREATE_SLOT_FAILED'),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => deleteTimeSlot(accessToken!, slotId),
    onSuccess: invalidate,
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assignTeacher(accessToken!, id, {
        teacherUserId: assignForm.teacherUserId,
        subject: assignForm.subject,
        isMainTeacher: assignForm.isMainTeacher,
      }),
    onSuccess: () => {
      setShowAssign(false);
      setAssignForm({ teacherUserId: '', subject: '', isMainTeacher: false });
      setAssignError(null);
      invalidate();
    },
    onError: (e) => setAssignError(e instanceof Error ? e.message : "Échec de l'assignation"),
  });

  const removeTeacherMutation = useMutation({
    mutationFn: (assignmentId: string) => removeClassTeacher(accessToken!, assignmentId),
    onSuccess: invalidate,
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

  // Matières enseignées dans la classe — dérivées des affectations + créneaux.
  const classSubjects = [
    ...new Set([
      ...(data.teachers ?? []).map((t) => t.subject),
      ...(data.timeSlots ?? []).map((s) => s.subject),
    ].filter(Boolean)),
  ].sort();

  function emojiFor(subjectName: string): string {
    return subjects.find((s) => s.name === subjectName)?.emoji ?? '📘';
  }

  return (
    <div className="container mx-auto max-w-7xl px-1 py-2 sm:px-4 sm:py-8">
      <Link href="/classes" className="text-sm text-primary hover:underline">
        ← Toutes les classes
      </Link>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">{data.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Niveau {data.level} · Année {data.schoolYear}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {showAdd ? 'Annuler' : '+ Créneau EDT'}
          </button>
        )}
      </div>

      {/* ── Matières enseignées ─────────────────────────────────────────── */}
      {classSubjects.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-medium">Matières enseignées</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {classSubjects.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm"
              >
                <span aria-hidden>{emojiFor(s)}</span> {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Enseignants assignés ────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-medium">Enseignants assignés</h2>
          {canManage && (
            <button
              type="button"
              onClick={() => { setShowAssign((v) => !v); setAssignError(null); }}
              className="h-9 rounded-md border px-3 text-sm font-medium transition hover:bg-muted"
            >
              {showAssign ? 'Annuler' : '+ Assigner un enseignant'}
            </button>
          )}
        </div>

        {canManage && showAssign && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!assignForm.teacherUserId || !assignForm.subject) {
                setAssignError('Sélectionnez un enseignant et une matière.');
                return;
              }
              assignMutation.mutate();
            }}
            className="mt-4 grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-3"
          >
            <label className="block text-sm">
              Enseignant *
              <select
                value={assignForm.teacherUserId}
                onChange={(e) => setAssignForm({ ...assignForm, teacherUserId: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border px-2"
              >
                <option value="">— Choisir —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
              {teachers.length === 0 && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Aucun enseignant. Créez-en un dans « Enseignants ».
                </span>
              )}
            </label>
            <label className="block text-sm">
              Matière *
              <select
                value={assignForm.subject}
                onChange={(e) => setAssignForm({ ...assignForm, subject: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border px-2"
              >
                <option value="">— Choisir —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.emoji ? `${s.emoji} ` : ''}{s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                checked={assignForm.isMainTeacher}
                onChange={(e) => setAssignForm({ ...assignForm, isMainTeacher: e.target.checked })}
                className="mb-2.5 h-4 w-4 accent-primary"
              />
              <span className="mb-2">Enseignant principal</span>
            </label>
            {assignError && <p className="text-sm text-rose-600 sm:col-span-3">Erreur : {assignError}</p>}
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={assignMutation.isPending}
                className="h-10 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Assignation…' : 'Assigner'}
              </button>
            </div>
          </form>
        )}

        {data.teachers?.length ? (
          <ul className="mt-3 divide-y rounded-lg border bg-card">
            {data.teachers.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-medium">
                    {t.teacher?.firstName} {t.teacher?.lastName}
                  </span>{' '}
                  <span className="text-muted-foreground">— {t.subject}</span>{' '}
                  {t.isMainTeacher && (
                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Principal
                    </span>
                  )}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => removeTeacherMutation.mutate(t.id)}
                    disabled={removeTeacherMutation.isPending}
                    className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Aucun enseignant assigné.</p>
        )}
      </section>

      {canManage && showAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!slotForm.subject || slotForm.periodEnd <= slotForm.periodStart) {
              setSlotError('VALIDATION');
              return;
            }
            addSlotMutation.mutate();
          }}
          className="mt-6 grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-2 lg:grid-cols-6"
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
            <select
              value={slotForm.subject}
              onChange={(e) => setSlotForm({ ...slotForm, subject: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border px-2"
            >
              <option value="">— Choisir —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.emoji ? `${s.emoji} ` : ''}{s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Enseignant
            <select
              value={slotForm.teacherUserId}
              onChange={(e) => setSlotForm({ ...slotForm, teacherUserId: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border px-2"
            >
              <option value="">— Aucun —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
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
            <p className="text-sm text-rose-600 sm:col-span-2 lg:col-span-6">
              {slotError === 'VALIDATION'
                ? 'Choisissez une matière et vérifiez les horaires (fin après début).'
                : `Erreur : ${slotError}`}
            </p>
          )}
          <div className="sm:col-span-2 lg:col-span-6">
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
                              {canManage && (
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
