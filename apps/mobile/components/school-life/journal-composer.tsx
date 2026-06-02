import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';

import { Button, FormField, FormSheet, Picker, colors, radius, type PickerOption } from '@klasso/ui-mobile';
import {
  createDailyLog,
  pickAndUploadJournalPhoto,
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
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: studentsData } = useQuery({
    queryKey: ['students', 'journal-picker'],
    queryFn: () => listStudents({ pageSize: 100 }),
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
    setPhotoUrl('');
    setUploadErr(undefined);
    setErrors({});
  }

  async function attachPhoto() {
    setUploadErr(undefined);
    setUploading(true);
    try {
      const url = await pickAndUploadJournalPhoto();
      if (url) setPhotoUrl(url);
    } catch (e) {
      setUploadErr((e as Error).message);
    } finally {
      setUploading(false);
    }
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
      photoUrl: photoUrl || undefined,
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

      {/* Photo du jour */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: 6 }}>
        Photo du jour
      </Text>
      {photoUrl ? (
        <View style={{ marginBottom: 14 }}>
          <Image
            source={{ uri: photoUrl }}
            style={{ width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.paper[100] }}
            resizeMode="cover"
          />
          <Pressable onPress={() => setPhotoUrl('')} accessibilityRole="button" accessibilityLabel="Retirer la photo" style={{ marginTop: 6 }}>
            <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>Retirer la photo</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={attachPhoto}
          disabled={uploading || Platform.OS !== 'web'}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une photo"
          style={{
            paddingVertical: 12,
            borderRadius: radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.ink[300],
            alignItems: 'center',
            marginBottom: 6,
            opacity: Platform.OS !== 'web' ? 0.5 : 1,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.ink[500], fontWeight: '600' }}>
            {uploading ? 'Envoi…' : Platform.OS === 'web' ? '📷 Prendre / choisir une photo' : 'Disponible sur le web'}
          </Text>
        </Pressable>
      )}
      {uploadErr ? (
        <Text style={{ fontSize: 12, color: colors.status.danger500, marginBottom: 8 }}>{uploadErr}</Text>
      ) : null}

      {mutation.error ? (
        <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
          Erreur : {(mutation.error as Error).message}
        </Text>
      ) : null}
    </FormSheet>
  );
}
