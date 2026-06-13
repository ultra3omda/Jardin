import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  ConfirmDialog,
  EmptyState,
  Fab,
  FormField,
  FormSheet,
  Picker,
  colors,
  radius,
  type PickerOption,
} from '@klasso/ui-mobile';
import {
  assignClassTeacher,
  createClass,
  deleteClass,
  useMyClasses,
  type ClassSummary,
} from '@/lib/api/classes';
import { useDirectory } from '@/lib/api/staff';
import { useSubjects } from '@/lib/api/subjects';
import { ScheduleEditorSheet } from '@/components/classes/schedule-editor-sheet';

const YEAR_RE = /^\d{4}-\d{4}$/;

function currentSchoolYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export default function ManageClassesScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useMyClasses(false);
  const { data: teachersData } = useDirectory('teachers');
  const { data: subjectsData } = useSubjects();

  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<ClassSummary | null>(null);
  const [edtFor, setEdtFor] = useState<ClassSummary | null>(null);
  const [toDelete, setToDelete] = useState<ClassSummary | null>(null);

  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [assignErr, setAssignErr] = useState<Record<string, string>>({});

  const classes = data ?? [];

  const teacherOptions = useMemo<PickerOption[]>(
    () =>
      (teachersData?.items ?? [])
        .filter((t) => !t.deletedAt)
        .map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}`, hint: t.email })),
    [teachersData],
  );
  const subjectOptions = useMemo<PickerOption[]>(
    () => (subjectsData?.items ?? []).map((s) => ({ value: s.name, label: s.name })),
    [subjectsData],
  );

  const createM = useMutation({
    mutationFn: () => createClass({ name: name.trim(), level: level.trim(), schoolYear }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['classes'] });
      setCreateOpen(false);
      setName('');
      setLevel('');
      setErrors({});
    },
  });

  const assignM = useMutation({
    mutationFn: () => assignClassTeacher(assignFor!.id, teacherId, subject),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['classes'] });
      setAssignFor(null);
      setTeacherId('');
      setSubject('');
      setAssignErr({});
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['classes'] });
      setToDelete(null);
    },
  });

  function submitCreate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nom requis';
    if (!level.trim()) e.level = 'Niveau requis';
    if (!YEAR_RE.test(schoolYear)) e.schoolYear = 'Format AAAA-AAAA';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  function submitAssign() {
    const e: Record<string, string> = {};
    if (!teacherId) e.teacherId = 'Enseignant requis';
    if (!subject) e.subject = 'Matière requise';
    setAssignErr(e);
    if (Object.keys(e).length) return;
    assignM.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
        ) : classes.length === 0 ? (
          <EmptyState icon="school-outline" title="Aucune classe" description="Créez-en une avec le bouton +." />
        ) : (
          classes.map((c) => (
            <View
              key={c.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>{c.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>
                    {c.level} · {c.studentCount ?? 0} élève{(c.studentCount ?? 0) > 1 ? 's' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setToDelete(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${c.name}`}
                  hitSlop={8}
                >
                  <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>
                    Supprimer
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setAssignFor(c)}
                accessibilityRole="button"
                accessibilityLabel={`Affecter un enseignant à ${c.name}`}
                style={{
                  marginTop: 12,
                  paddingVertical: 9,
                  borderRadius: radius.md,
                  backgroundColor: colors.ambre[50],
                  borderWidth: 1,
                  borderColor: colors.ambre[100],
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ambre[700] }}>
                  Affecter un enseignant
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setEdtFor(c)}
                accessibilityRole="button"
                accessibilityLabel={`Emploi du temps de ${c.name}`}
                style={{
                  marginTop: 8,
                  paddingVertical: 9,
                  borderRadius: radius.md,
                  backgroundColor: colors.paper[100],
                  borderWidth: 1,
                  borderColor: colors.paper[100],
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink[900] }}>
                  Emploi du temps
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouvelle classe" extended onPress={() => setCreateOpen(true)} />

      {/* Create class */}
      <FormSheet
        visible={createOpen}
        title="Nouvelle classe"
        onClose={() => setCreateOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setCreateOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Créer" onPress={submitCreate} loading={createM.isPending} />
            </View>
          </View>
        }
      >
        <FormField label="Nom" required value={name} onChangeText={setName} error={errors.name} placeholder="CP-A" />
        <FormField label="Niveau" required value={level} onChangeText={setLevel} error={errors.level} placeholder="CP" />
        <FormField
          label="Année scolaire"
          required
          value={schoolYear}
          onChangeText={setSchoolYear}
          error={errors.schoolYear}
          placeholder="2025-2026"
          autoCapitalize="none"
        />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      {/* Assign teacher */}
      <FormSheet
        visible={!!assignFor}
        title={`Affecter — ${assignFor?.name ?? ''}`}
        onClose={() => setAssignFor(null)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setAssignFor(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Affecter" onPress={submitAssign} loading={assignM.isPending} />
            </View>
          </View>
        }
      >
        <Picker
          label="Enseignant"
          required
          value={teacherId}
          onChange={setTeacherId}
          options={teacherOptions}
          error={assignErr.teacherId}
          placeholder={teacherOptions.length ? 'Choisir…' : 'Aucun enseignant'}
          disabled={teacherOptions.length === 0}
        />
        <Picker
          label="Matière"
          required
          value={subject}
          onChange={setSubject}
          options={subjectOptions}
          error={assignErr.subject}
          placeholder={subjectOptions.length ? 'Choisir…' : 'Aucune matière'}
          disabled={subjectOptions.length === 0}
        />
        {assignM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(assignM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      <ScheduleEditorSheet
        classId={edtFor?.id ?? null}
        className={edtFor?.name ?? ''}
        visible={!!edtFor}
        onClose={() => setEdtFor(null)}
      />

      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer cette classe ?"
        message={`${toDelete?.name ?? ''} sera retirée. Les élèves ne seront pas supprimés.`}
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}
