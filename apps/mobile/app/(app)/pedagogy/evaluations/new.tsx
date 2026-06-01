import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, FormField, Picker, colors, type PickerOption } from '@klasso/ui-mobile';
import { createEvaluation, type CreateEvaluationInput } from '@/lib/api/evaluations';
import { useMyClasses } from '@/lib/api/classes';
import { useSubjects } from '@/lib/api/subjects';
import { useGradePeriods } from '@/lib/api/grade-periods';
import { useAuthStore } from '@/lib/auth/store';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Lot 3 — Création d'une évaluation (admin + enseignant). Les listes de choix
 * (classe / matière / période) sont des pickers recherchables.
 */
export default function NewEvaluationScreen() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  // Teachers can only create on their assigned classes → scope the picker.
  const { data: classes } = useMyClasses(role === 'TEACHER');
  const { data: subjectsData } = useSubjects();
  const { data: periodsData } = useGradePeriods();

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradePeriodId, setGradePeriodId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [maxScore, setMaxScore] = useState('20');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const classOptions = useMemo<PickerOption[]>(
    () => (classes ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.level })),
    [classes],
  );
  const subjectOptions = useMemo<PickerOption[]>(
    () =>
      (subjectsData?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.emoji ? `${s.emoji} ` : ''}${s.name}`,
      })),
    [subjectsData],
  );
  const periodOptions = useMemo<PickerOption[]>(
    () =>
      (periodsData?.items ?? [])
        .filter((p) => !p.isClosed)
        .map((p) => ({ value: p.id, label: p.name, hint: p.schoolYear })),
    [periodsData],
  );

  const mutation = useMutation({
    mutationFn: (input: CreateEvaluationInput) => createEvaluation(input),
    onSuccess: (ev) => {
      void qc.invalidateQueries({ queryKey: ['evaluations', 'list'] });
      router.replace({ pathname: '/(app)/pedagogy/evaluations/[id]', params: { id: ev.id } });
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!classId) e.classId = 'Classe requise';
    if (!subjectId) e.subjectId = 'Matière requise';
    if (!gradePeriodId) e.gradePeriodId = 'Période requise';
    if (!title.trim()) e.title = 'Titre requis';
    if (!DATE_RE.test(date)) e.date = 'Format AAAA-MM-JJ';
    const max = parseFloat(maxScore);
    if (!Number.isFinite(max) || max <= 0) e.maxScore = 'Barème invalide';
    setErrors(e);
    if (Object.keys(e).length) return;
    mutation.mutate({ classId, subjectId, gradePeriodId, title: title.trim(), date, maxScore: max });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Picker
        label="Classe"
        required
        value={classId}
        onChange={setClassId}
        options={classOptions}
        error={errors.classId}
        placeholder={classOptions.length ? 'Choisir une classe…' : 'Aucune classe'}
        disabled={classOptions.length === 0}
      />
      <Picker
        label="Matière"
        required
        value={subjectId}
        onChange={setSubjectId}
        options={subjectOptions}
        error={errors.subjectId}
        placeholder={subjectOptions.length ? 'Choisir une matière…' : 'Aucune matière'}
        disabled={subjectOptions.length === 0}
      />
      <Picker
        label="Période"
        required
        value={gradePeriodId}
        onChange={setGradePeriodId}
        options={periodOptions}
        error={errors.gradePeriodId}
        placeholder={periodOptions.length ? 'Choisir une période…' : 'Aucune période ouverte'}
        disabled={periodOptions.length === 0}
      />
      <FormField
        label="Titre"
        required
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        placeholder="Contrôle n°1"
      />
      <FormField
        label="Date"
        required
        value={date}
        onChangeText={setDate}
        error={errors.date}
        placeholder="AAAA-MM-JJ"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
      <FormField
        label="Barème (note max)"
        required
        value={maxScore}
        onChangeText={(v) => setMaxScore(v.replace(/[^0-9.]/g, ''))}
        error={errors.maxScore}
        keyboardType="decimal-pad"
      />

      {periodOptions.length === 0 ? (
        <Text style={{ fontSize: 12, color: colors.ambre[600], marginBottom: 12 }}>
          Aucune période de notation ouverte. La direction doit en créer une (web).
        </Text>
      ) : null}
      {mutation.error ? (
        <Text style={{ fontSize: 13, color: colors.status.danger500, marginBottom: 12 }}>
          Erreur : {(mutation.error as Error).message}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button label="Annuler" variant="secondary" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Créer" onPress={submit} loading={mutation.isPending} />
        </View>
      </View>
    </ScrollView>
  );
}
