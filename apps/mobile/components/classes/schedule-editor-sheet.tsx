import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Button,
  ConfirmDialog,
  FormField,
  FormSheet,
  Picker,
  colors,
  radius,
  type PickerOption,
} from '@klasso/ui-mobile';
import {
  CLASSES_KEYS,
  createTimeSlot,
  deleteTimeSlot,
  useClassDetail,
  type TimeSlot,
} from '@/lib/api/classes';
import { useSubjects } from '@/lib/api/subjects';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
};

const DAY_OPTIONS: PickerOption[] = Object.entries(DAY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface ScheduleEditorSheetProps {
  classId: string | null;
  className: string;
  visible: boolean;
  onClose: () => void;
}

/** Éditeur d'emploi du temps d'une classe (créneaux : ajout / suppression). */
export function ScheduleEditorSheet({
  classId,
  className,
  visible,
  onClose,
}: ScheduleEditorSheetProps) {
  const qc = useQueryClient();
  const detail = useClassDetail(visible && classId ? classId : '');
  const { data: subjectsData } = useSubjects();

  const [day, setDay] = useState('1');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [subject, setSubject] = useState('');
  const [room, setRoom] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<TimeSlot | null>(null);

  const subjectOptions = useMemo<PickerOption[]>(
    () => (subjectsData?.items ?? []).map((s) => ({ value: s.name, label: s.name })),
    [subjectsData],
  );

  const slots = useMemo(
    () =>
      [...(detail.data?.timeSlots ?? [])].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.periodStart.localeCompare(b.periodStart),
      ),
    [detail.data],
  );

  function invalidate() {
    if (classId) void qc.invalidateQueries({ queryKey: CLASSES_KEYS.detail(classId) });
    void qc.invalidateQueries({ queryKey: ['classes'] });
  }

  const createM = useMutation({
    mutationFn: () =>
      createTimeSlot(classId as string, {
        dayOfWeek: Number(day),
        periodStart: start,
        periodEnd: end,
        subject,
        room: room.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setStart('');
      setEnd('');
      setSubject('');
      setRoom('');
      setErrors({});
    },
  });

  const deleteM = useMutation({
    mutationFn: (slotId: string) => deleteTimeSlot(slotId),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!TIME_RE.test(start)) e.start = 'Format HH:MM';
    if (!TIME_RE.test(end)) e.end = 'Format HH:MM';
    if (TIME_RE.test(start) && TIME_RE.test(end) && end <= start) e.end = 'Doit être après le début';
    if (!subject) e.subject = 'Matière requise';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  return (
    <FormSheet
      visible={visible}
      title={`Emploi du temps — ${className}`}
      onClose={onClose}
      footer={
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button label="Fermer" variant="secondary" onPress={onClose} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Ajouter le créneau" onPress={submit} loading={createM.isPending} />
          </View>
        </View>
      }
    >
      {/* Existing slots */}
      {detail.isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginVertical: 16 }} />
      ) : slots.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 12 }}>
          Aucun créneau pour l&apos;instant.
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 220, marginBottom: 12 }}>
          {slots.map((s) => (
            <View
              key={s.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.paper[100],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink[900] }}>
                  {DAY_LABELS[s.dayOfWeek] ?? `Jour ${s.dayOfWeek}`} · {s.periodStart}–{s.periodEnd}
                </Text>
                <Text style={{ fontSize: 12, color: colors.ink[500] }}>
                  {s.subject}
                  {s.room ? ` · ${s.room}` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => setToDelete(s)}
                accessibilityRole="button"
                accessibilityLabel={`Supprimer le créneau ${s.subject}`}
                hitSlop={8}
              >
                <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>
                  Suppr.
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add form */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.paper[100],
          paddingTop: 12,
          marginTop: 4,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink[900], marginBottom: 8 }}>
          Nouveau créneau
        </Text>
        <Picker label="Jour" required value={day} onChange={setDay} options={DAY_OPTIONS} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormField
              label="Début"
              required
              value={start}
              onChangeText={setStart}
              error={errors.start}
              placeholder="08:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Fin"
              required
              value={end}
              onChangeText={setEnd}
              error={errors.end}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
        <Picker
          label="Matière"
          required
          value={subject}
          onChange={setSubject}
          options={subjectOptions}
          error={errors.subject}
          placeholder={subjectOptions.length ? 'Choisir…' : 'Aucune matière'}
          disabled={subjectOptions.length === 0}
        />
        <FormField label="Salle" value={room} onChangeText={setRoom} placeholder="Salle B (optionnel)" />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </View>

      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer ce créneau ?"
        message={
          toDelete
            ? `${DAY_LABELS[toDelete.dayOfWeek] ?? ''} ${toDelete.periodStart}–${toDelete.periodEnd} (${toDelete.subject})`
            : ''
        }
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </FormSheet>
  );
}
