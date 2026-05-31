'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { useRouter } from '@/i18n/routing';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import {
  deleteStudent,
  getStudent,
  updateStudent,
  type StudentSummary,
} from '@/lib/api/students';
import { listClasses } from '@/lib/api/classes';
import { useAuthStore } from '@/lib/auth/use-auth-store';

import { ParentsSection } from './parents-section';
import {
  updateStudentSchema,
  type UpdateStudentFormValues,
} from '@/lib/validation/student.schemas';

interface Props {
  id: string;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {value !== null && value !== undefined && value !== '' ? (
          value
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  );
}

export function StudentDetail({ id }: Props) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role === 'SCHOOL_ADMIN';
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: apiStudent,
    isLoading,
  } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(accessToken!, id),
    enabled: !!accessToken,
  });

  const student = apiStudent;

  const form = useForm<UpdateStudentFormValues>({
    resolver: zodResolver(updateStudentSchema),
  });

  const updateMut = useMutation({
    mutationFn: (values: UpdateStudentFormValues) =>
      updateStudent(accessToken!, id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      setEditing(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteStudent(accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      router.push('/students' as Route);
    },
  });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Chargement…
      </p>
    );
  }
  if (!student) {
    return <p className="text-sm text-muted-foreground">Élève introuvable.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={'/students' as Route}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Élèves
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">Classe {student.classroom}</p>
        </div>
        {canWrite && !editing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                form.reset(asFormValues(student));
                setEditing(true);
              }}
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-9 items-center rounded-md border border-rose-300 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Supprimer
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <EditPanel
          form={form}
          onCancel={() => setEditing(false)}
          onSubmit={(v) => updateMut.mutate(v)}
          pending={updateMut.isPending}
          error={updateMut.error ? (updateMut.error as Error).message : null}
        />
      ) : (
        <ReadOnlyPanel student={student} />
      )}

      {!editing && <ParentsSection studentId={id} />}

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h2 id="confirm-delete-title" className="text-lg font-semibold">
              Confirmer la suppression
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {student.firstName} {student.lastName} sera marqué comme supprimé. Les
              historiques (notes, paiements) seront préservés.
            </p>
            {deleteMut.error && (
              <p className="mt-2 text-xs text-rose-600">
                Erreur : {(deleteMut.error as Error).message}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-9 rounded-md border px-3 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                className="h-9 rounded-md bg-rose-600 px-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function asFormValues(s: StudentSummary): UpdateStudentFormValues {
  return {
    firstName: s.firstName,
    lastName: s.lastName,
    dateOfBirth: s.dateOfBirth,
    sex: s.sex,
    nationality: s.nationality ?? '',
    classId: s.classId ?? '',
    classroom: s.classroom,
    enrollmentDate: s.enrollmentDate,
    previousSchooling: s.previousSchooling ?? '',
    parentEmail: s.parentEmail,
    siblingsCount: s.siblingsCount,
    addressLine: s.addressLine ?? '',
    city: s.city ?? '',
    postalCode: s.postalCode ?? '',
    country: s.country ?? '',
    motherTongue: s.motherTongue ?? '',
    medicalNotes: s.medicalNotes ?? '',
    photoUrl: s.photoUrl ?? '',
  };
}

function ReadOnlyPanel({ student }: { student: StudentSummary }) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Identité</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date de naissance" value={student.dateOfBirth} />
          <Field label="Sexe" value={student.sex === 'M' ? 'Masculin' : 'Féminin'} />
          <Field label="Nationalité" value={student.nationality} />
          <Field label="Langue maternelle" value={student.motherTongue} />
        </dl>
      </section>
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Scolarité</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Classe" value={student.classroom} />
          <Field label="Inscription" value={student.enrollmentDate} />
          <Field label="Antécédents" value={student.previousSchooling} />
        </dl>
      </section>
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Famille &amp; Contact</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Parent" value={student.parentEmail} />
          <Field label="Frères/sœurs" value={student.siblingsCount} />
          <Field label="Adresse" value={student.addressLine} />
          <Field label="Ville" value={student.city} />
          <Field label="Code postal" value={student.postalCode} />
          <Field label="Pays" value={student.country} />
        </dl>
      </section>
      {student.medicalNotes && (
        <section className="rounded-lg border-2 border-amber-300 bg-amber-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-amber-900">
            ⚠️ Notes médicales (RGPD)
          </h2>
          <p className="whitespace-pre-wrap text-sm text-amber-900">
            {student.medicalNotes}
          </p>
        </section>
      )}
    </div>
  );
}

function EditPanel(props: {
  form: UseFormReturn<UpdateStudentFormValues>;
  onCancel: () => void;
  onSubmit: (v: UpdateStudentFormValues) => void;
  pending: boolean;
  error: string | null;
}) {
  const { form, onCancel, onSubmit, pending, error } = props;
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'options'],
    queryFn: () => listClasses(accessToken!),
    enabled: !!accessToken,
  });
  const classOptions = classesData?.items ?? [];
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4 rounded-lg border bg-card p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Prénom</span>
          <input
            {...form.register('firstName')}
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Nom</span>
          <input
            {...form.register('lastName')}
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Classe</span>
          <select
            {...form.register('classId')}
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="">— Non assigné —</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email parent</span>
          <input
            type="email"
            {...form.register('parentEmail')}
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Édition rapide des champs courants.
      </p>
      {error && (
        <p className="text-sm text-rose-600" role="alert">
          Erreur : {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-9 rounded-md border px-3 text-sm">
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
