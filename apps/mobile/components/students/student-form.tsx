import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  Button,
  FormField,
  Picker,
  colors,
  type PickerOption,
} from '@klasso/ui-mobile';
import { useMyClasses } from '@/lib/api/classes';
import { useParents } from '@/lib/api/parents';
import {
  createStudent,
  updateStudent,
  type CreateStudentInput,
  type StudentSummary,
} from '@/lib/api/students';

/**
 * Formulaire élève partagé (création + édition), réservé à l'admin.
 * Reprend le parcours web : parent obligatoire (picker recherchable), classe
 * obligatoire (picker), identité + santé light. Pas de react-hook-form côté
 * mobile — état local + validation simple suffisent pour ce périmètre.
 */
const SEX_OPTIONS: PickerOption[] = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
];

const RELATION_OPTIONS: PickerOption[] = [
  { value: 'MOTHER', label: 'Mère' },
  { value: 'FATHER', label: 'Père' },
  { value: 'LEGAL_GUARDIAN', label: 'Tuteur légal' },
  { value: 'OTHER', label: 'Autre' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface FormState {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  classId: string;
  enrollmentDate: string;
  parentEmail: string;
  parentRelationType: string;
  siblingsCount: string;
  addressLine: string;
  city: string;
  medicalNotes: string;
}

function initialState(s?: StudentSummary): FormState {
  return {
    firstName: s?.firstName ?? '',
    lastName: s?.lastName ?? '',
    dateOfBirth: s?.dateOfBirth?.slice(0, 10) ?? '',
    sex: s?.sex ?? '',
    classId: s?.classId ?? '',
    enrollmentDate: s?.enrollmentDate?.slice(0, 10) ?? '',
    parentEmail: s?.parentEmail ?? '',
    parentRelationType: 'MOTHER',
    siblingsCount: s ? String(s.siblingsCount) : '0',
    addressLine: s?.addressLine ?? '',
    city: s?.city ?? '',
    medicalNotes: s?.medicalNotes ?? '',
  };
}

interface StudentFormProps {
  mode: 'create' | 'edit';
  student?: StudentSummary;
  onSuccess: (s: StudentSummary) => void;
  onCancel: () => void;
}

export function StudentForm({ mode, student, onSuccess, onCancel }: StudentFormProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(() => initialState(student));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Admin → toutes les classes (mine=false) ; le picker liste tout le tenant.
  const { data: classes } = useMyClasses(false);
  const { data: parentsData } = useParents();

  const classOptions = useMemo<PickerOption[]>(
    () => (classes ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.level })),
    [classes],
  );
  const parentOptions = useMemo<PickerOption[]>(
    () =>
      (parentsData?.items ?? []).map((p) => ({
        value: p.email,
        label: `${p.firstName} ${p.lastName}`,
        hint: p.email,
      })),
    [parentsData],
  );

  const mutation = useMutation({
    mutationFn: (payload: CreateStudentInput) => {
      const picked = (classes ?? []).find((c) => c.id === payload.classId);
      const body = { ...payload, classroom: picked?.name };
      return mode === 'create'
        ? createStudent(body)
        : updateStudent(student!.id, body);
    },
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['students'] });
      if (student) void qc.invalidateQueries({ queryKey: ['student', student.id] });
      onSuccess(s);
    },
  });

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) e.firstName = 'Prénom requis';
    if (!form.lastName.trim()) e.lastName = 'Nom requis';
    if (!DATE_RE.test(form.dateOfBirth)) e.dateOfBirth = 'Format AAAA-MM-JJ';
    if (!form.sex) e.sex = 'Sexe requis';
    if (!form.classId) e.classId = 'Classe requise';
    if (!form.parentEmail) e.parentEmail = 'Parent requis';
    if (form.enrollmentDate && !DATE_RE.test(form.enrollmentDate))
      e.enrollmentDate = 'Format AAAA-MM-JJ';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit() {
    if (!validate()) return;
    const siblings = parseInt(form.siblingsCount, 10);
    mutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth,
      sex: form.sex as 'M' | 'F',
      classId: form.classId,
      parentEmail: form.parentEmail,
      parentRelationType: form.parentRelationType as CreateStudentInput['parentRelationType'],
      enrollmentDate: form.enrollmentDate || undefined,
      siblingsCount: Number.isFinite(siblings) ? siblings : 0,
      addressLine: form.addressLine || undefined,
      city: form.city || undefined,
      medicalNotes: form.medicalNotes || undefined,
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <SectionTitle>Identité</SectionTitle>
      <FormField
        label="Prénom"
        required
        value={form.firstName}
        onChangeText={(v) => set('firstName', v)}
        error={errors.firstName}
        placeholder="Alice"
      />
      <FormField
        label="Nom"
        required
        value={form.lastName}
        onChangeText={(v) => set('lastName', v)}
        error={errors.lastName}
        placeholder="Ben Salem"
      />
      <FormField
        label="Date de naissance"
        required
        value={form.dateOfBirth}
        onChangeText={(v) => set('dateOfBirth', v)}
        error={errors.dateOfBirth}
        placeholder="AAAA-MM-JJ"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
      <Picker
        label="Sexe"
        required
        value={form.sex}
        onChange={(v) => set('sex', v)}
        options={SEX_OPTIONS}
        error={errors.sex}
        placeholder="Sélectionner…"
      />

      <SectionTitle>Scolarité</SectionTitle>
      <Picker
        label="Classe"
        required
        value={form.classId}
        onChange={(v) => set('classId', v)}
        options={classOptions}
        error={errors.classId}
        placeholder={classOptions.length ? 'Choisir une classe…' : 'Aucune classe'}
        emptyText="Aucune classe ne correspond."
        disabled={classOptions.length === 0}
      />
      <FormField
        label="Date d'inscription"
        value={form.enrollmentDate}
        onChangeText={(v) => set('enrollmentDate', v)}
        error={errors.enrollmentDate}
        placeholder="AAAA-MM-JJ"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      <SectionTitle>Famille & contact</SectionTitle>
      <Picker
        label="Parent / tuteur"
        required
        value={form.parentEmail}
        onChange={(v) => set('parentEmail', v)}
        options={parentOptions}
        error={errors.parentEmail}
        placeholder={parentOptions.length ? 'Rechercher un parent…' : 'Aucun parent'}
        emptyText="Aucun parent ne correspond."
        disabled={parentOptions.length === 0}
      />
      {parentOptions.length === 0 ? (
        <Text style={{ fontSize: 12, color: colors.ambre[600], marginTop: -8, marginBottom: 14 }}>
          Aucun compte parent. Créez-en un d&apos;abord (annuaire) avant d&apos;ajouter l&apos;élève.
        </Text>
      ) : null}
      <Picker
        label="Lien de parenté"
        value={form.parentRelationType}
        onChange={(v) => set('parentRelationType', v)}
        options={RELATION_OPTIONS}
      />
      <FormField
        label="Nombre de frères / sœurs"
        value={form.siblingsCount}
        onChangeText={(v) => set('siblingsCount', v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
      />
      <FormField
        label="Adresse"
        value={form.addressLine}
        onChangeText={(v) => set('addressLine', v)}
      />
      <FormField label="Ville" value={form.city} onChangeText={(v) => set('city', v)} />

      <SectionTitle>Santé (données sensibles)</SectionTitle>
      <FormField
        label="Notes médicales"
        value={form.medicalNotes}
        onChangeText={(v) => set('medicalNotes', v)}
        multiline
        hint="Allergies, traitements légers. Accès tracé (RGPD)."
      />

      {mutation.error ? (
        <Text style={{ fontSize: 13, color: colors.status.danger500, marginBottom: 12 }}>
          Erreur : {(mutation.error as Error).message}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="Annuler" variant="secondary" onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={mode === 'create' ? "Créer l'élève" : 'Enregistrer'}
            onPress={submit}
            loading={mutation.isPending}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.ink[300],
        marginTop: 12,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}
