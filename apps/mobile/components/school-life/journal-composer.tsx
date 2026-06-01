import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, FormField, FormSheet, Picker, colors, type PickerOption } from '@klasso/ui-mobile';
import {
  createDailyLog,
  SCHOOL_LIFE_KEYS,
  type ChildMood,
  type CreateDailyLogInput,
} from '@/lib/api/school-life';
import { listStudents } from '@/lib/api/students';

const MOOD_OPTIONS: PickerOption[] = [
  { value: 'HAPPY', label: '😊 Joyeux' },
  { value: 'CALM', label: '😌 Calme' },
  { value: 'TIRED', label: '😴 Fatigué' },
  { value: 'UPSET', label: '😟 Contrarié' },
  { value: 'SICK', label: '🤒 Malade' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bottom sheet to add a daily-log entry (cahier de liaison). Teacher/admin. */
export function JournalComposer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(today());
  const [mood, setMood] = useState('');
  const [meals, setMeals] = useState('');
  const [nap, setNap] = useState('');
  const [generalNote, setGeneralNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: studentsData } = useQuery({
    queryKey: ['students', 'journal-picker'],
    queryFn: () => listStudents({ pageSize: 200 }),
    enabled: visible,
  });

  const studentOptions = useMemo<PickerOption[]>(
    () =>
      (studentsData?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.lastName} ${s.firstName}`,
        hint: s.classroom,
      })),
    [studentsData],
  );

  const mutation = useMutation({
    mutationFn: (input: CreateDailyLogInput) => createDailyLog(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SCHOOL_LIFE_KEYS.journal });
      reset();
      onClose();
    },
  });

  function reset() {
    setStudentId('');
    setMood('');
    setMeals('');
    setNap('');
    setGeneralNote('');
    setErrors({});
  }

  function submit() {
    const e: Record<string, string> = {};
    if (!studentId) e.studentId = 'Élève requis';
    if (!DATE_RE.test(date)) e.date = 'Format AAAA-MM-JJ';
    setErrors(e);
    if (Object.keys(e).length) return;
    mutation.mutate({
      studentId,
      date,
      mood: (mood || undefined) as ChildMood | undefined,
      meals: meals || undefined,
      nap: nap || undefined,
      generalNote: generalNote || undefined,
    });
  }

  return (
    <FormSheet
      visible={visible}
      title="Nouvelle entrée"
      onClose={onClose}
      footer={
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button label="Annuler" variant="secondary" onPress={onClose} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Publier" onPress={submit} loading={mutation.isPending} />
          </View>
        </View>
      }
    >
      <Picker
        label="Élève"
        required
        value={studentId}
        onChange={setStudentId}
        options={studentOptions}
        error={errors.studentId}
        placeholder="Choisir un élève…"
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
      <Picker label="Humeur" value={mood} onChange={setMood} options={MOOD_OPTIONS} placeholder="—" />
      <FormField label="Repas" value={meals} onChangeText={setMeals} placeholder="A bien mangé…" />
      <FormField label="Sieste" value={nap} onChangeText={setNap} placeholder="1h de sieste…" />
      <FormField
        label="Mot du jour"
        value={generalNote}
        onChangeText={setGeneralNote}
        multiline
        placeholder="Message pour les parents…"
      />
      {mutation.error ? (
        <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
          Erreur : {(mutation.error as Error).message}
        </Text>
      ) : null}
    </FormSheet>
  );
}
