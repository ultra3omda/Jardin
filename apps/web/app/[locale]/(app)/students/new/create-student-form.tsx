'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { useRouter } from '@/i18n/routing';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  createStudent,
  StudentsApiError,
  type StudentSummary,
} from '@/lib/api/students';
import { listClasses } from '@/lib/api/classes';
import { listParents } from '@/lib/api/staff';
import { ComboPicker } from '@/components/pickers/combo-picker';
import { useSchoolTerms } from '@/lib/school/use-school-terms';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import {
  createStudentSchema,
  type CreateStudentFormValues,
} from '@/lib/validation/student.schemas';

import { PhotoUpload } from '../components/photo-upload';

/**
 * V2 — Module Élèves : formulaire création sectionné.
 * 4 sections : Identité / Scolarité / Famille & Contact / Santé (PHI light avec
 * warning RGPD — module Santé V8 pour PHI strict).
 */
const COUNTRIES = ['TN', 'FR', 'DZ', 'MA', 'EG', 'SA', 'AE', 'BE', 'CH', 'CA'];
const LANGUAGES = ['ar', 'fr', 'en', 'es', 'de', 'it'];

export function CreateStudentForm() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const terms = useSchoolTerms();
  const [created, setCreated] = useState<StudentSummary | null>(null);

  const form = useForm<CreateStudentFormValues>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      country: 'TN',
      motherTongue: 'ar',
      siblingsCount: 0,
    },
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes', 'options'],
    queryFn: () => listClasses(accessToken!),
    enabled: !!accessToken,
  });
  const classOptions = classesData?.items ?? [];

  const { data: parentsData } = useQuery({
    queryKey: ['parents', 'options'],
    queryFn: () => listParents(accessToken!),
    enabled: !!accessToken,
  });
  const parentOptions = parentsData?.items ?? [];

  const mutation = useMutation({
    mutationFn: (values: CreateStudentFormValues) => {
      // Lot 3 — on envoie classId (FK) ; classroom est dérivé du nom de la classe
      // choisie (l'API le re-synchronise de toute façon).
      const picked = classOptions.find((c) => c.id === values.classId);
      return createStudent(accessToken!, {
        ...values,
        classroom: picked?.name ?? values.classroom ?? '',
      });
    },
    onSuccess: (data) => setCreated(data),
  });

  if (created) {
    return (
      <div className="rounded-lg border bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900">Élève créé</h2>
        <p className="mt-1 text-sm text-emerald-800">
          {created.firstName} {created.lastName} a été ajouté à la classe {created.classroom}.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/students/${created.id}` as Route}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Voir la fiche
          </Link>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              form.reset({ country: 'TN', motherTongue: 'ar', siblingsCount: 0 });
            }}
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
          >
            Créer un autre élève
          </button>
          <Link
            href={'/students' as Route}
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!values.classId) {
      form.setError('classId', { type: 'required', message: `${terms.class} requise` });
      return;
    }
    mutation.mutate(values);
  });
  const fieldError = (name: keyof CreateStudentFormValues) =>
    form.formState.errors[name]?.message?.toString();

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* ============================== Identité ============================== */}
      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Identité</h2>

        <PhotoUpload
          initials="?"
          onUploaded={(url) => form.setValue('photoUrl', url)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="firstName">
              Prénom *
            </label>
            <input
              id="firstName"
              {...form.register('firstName')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
            {fieldError('firstName') && (
              <p className="mt-1 text-xs text-rose-600">{fieldError('firstName')}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="lastName">
              Nom *
            </label>
            <input
              id="lastName"
              {...form.register('lastName')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
            {fieldError('lastName') && (
              <p className="mt-1 text-xs text-rose-600">{fieldError('lastName')}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="dateOfBirth">
              Date de naissance *
            </label>
            <input
              id="dateOfBirth"
              type="date"
              {...form.register('dateOfBirth')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
            {fieldError('dateOfBirth') && (
              <p className="mt-1 text-xs text-rose-600">{fieldError('dateOfBirth')}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="sex">
              Sexe *
            </label>
            <select
              id="sex"
              {...form.register('sex')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">—</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
            {fieldError('sex') && (
              <p className="mt-1 text-xs text-rose-600">{fieldError('sex')}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="nationality">
              Nationalité
            </label>
            <select
              id="nationality"
              {...form.register('nationality')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">—</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="motherTongue">
              Langue maternelle
            </label>
            <select
              id="motherTongue"
              {...form.register('motherTongue')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ============================== Scolarité ============================== */}
      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Scolarité</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="classId">
              {terms.class} *
            </label>
            <select
              id="classId"
              {...form.register('classId')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              disabled={classOptions.length === 0}
            >
              <option value="">— Choisir —</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </option>
              ))}
            </select>
            {classOptions.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Aucune {terms.class.toLowerCase()}.{' '}
                <Link href={'/classes' as Route} className="text-primary underline">
                  Créez-en une
                </Link>{' '}
                d&apos;abord.
              </p>
            )}
            {fieldError('classId') && (
              <p className="mt-1 text-xs text-rose-600">{fieldError('classId')}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="enrollmentDate">
              Date d&apos;inscription
            </label>
            <input
              id="enrollmentDate"
              type="date"
              {...form.register('enrollmentDate')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="previousSchooling">
            Antécédents scolaires
          </label>
          <textarea
            id="previousSchooling"
            {...form.register('previousSchooling')}
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </section>

      {/* ============================== Famille & Contact ============================== */}
      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Famille &amp; Contact</h2>
        <p className="text-xs text-muted-foreground">
          L&apos;élève doit être rattaché à un compte parent existant. Si le parent n&apos;a pas
          encore de compte,{' '}
          <Link href={'/parents' as Route} className="font-medium text-primary hover:underline">
            créez-le d&apos;abord ici
          </Link>
          .
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="parentEmail">
              Parent / tuteur *
            </label>
            <div className="mt-1">
              <ComboPicker
                id="parentEmail"
                value={form.watch('parentEmail') ?? ''}
                onChange={(v) =>
                  form.setValue('parentEmail', v, { shouldValidate: true, shouldDirty: true })
                }
                placeholder="Rechercher un parent…"
                emptyText="Aucun parent ne correspond."
                options={parentOptions.map((p) => ({
                  value: p.email,
                  label: `${p.firstName} ${p.lastName}`,
                  hint: p.email,
                }))}
              />
            </div>
            {parentOptions.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Aucun compte parent. Créez-en un dans la page Parents avant d&apos;ajouter l&apos;élève.
              </p>
            )}
            {fieldError('parentEmail') && (
              <p className="mt-1 text-xs text-rose-600">{fieldError('parentEmail')}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="parentRelationType">
              Lien de parenté
            </label>
            <select
              id="parentRelationType"
              {...form.register('parentRelationType')}
              defaultValue="MOTHER"
              className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
              <option value="MOTHER">Mère</option>
              <option value="FATHER">Père</option>
              <option value="LEGAL_GUARDIAN">Tuteur légal</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="siblingsCount">
              Nombre de frères/sœurs
            </label>
            <input
              id="siblingsCount"
              type="number"
              min={0}
              max={20}
              {...form.register('siblingsCount')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="addressLine">
              Adresse
            </label>
            <input
              id="addressLine"
              {...form.register('addressLine')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="city">
              Ville
            </label>
            <input
              id="city"
              {...form.register('city')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="postalCode">
              Code postal
            </label>
            <input
              id="postalCode"
              {...form.register('postalCode')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="country">
              Pays
            </label>
            <select
              id="country"
              {...form.register('country')}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ============================== Santé (PHI light) ============================== */}
      <section className="space-y-4 rounded-lg border-2 border-amber-300 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-2xl leading-none">
            ⚠️
          </span>
          <div>
            <h2 className="text-lg font-semibold text-amber-900">
              Santé — données sensibles (RGPD)
            </h2>
            <p className="text-sm text-amber-800">
              Allergies, traitements légers, contacts d&apos;urgence. Accès tracé via audit log.
              Pour le médical strict (PHI), attendre le module Santé V8.
            </p>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="medicalNotes">
            Notes médicales (texte libre)
          </label>
          <textarea
            id="medicalNotes"
            {...form.register('medicalNotes')}
            rows={4}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </section>

      {mutation.error && (
        <p className="text-sm text-rose-600" role="alert">
          Erreur : {(mutation.error as StudentsApiError).message}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/students' as Route)}
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? 'Création…' : "Créer l'élève"}
        </button>
      </div>
    </form>
  );
}
