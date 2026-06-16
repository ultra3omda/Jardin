import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Fab,
  FormField,
  FormSheet,
  Picker,
  Skeleton,
  colors,
  radius,
  type PickerOption,
} from '@klasso/ui-mobile';
import {
  DISCIPLINE_KEY,
  SEVERITY_COLOR,
  SEVERITY_LABELS,
  SEVERITY_OPTIONS,
  createDiscipline,
  deleteDiscipline,
  listDiscipline,
  resolveDiscipline,
  type DisciplineIncident,
  type DisciplineSeverity,
} from '@/lib/api/discipline';
import { listStudents } from '@/lib/api/students';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
}

export default function ManageDisciplineScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: DISCIPLINE_KEY, queryFn: listDiscipline });
  const { data: studentsData } = useQuery({
    queryKey: ['students', 'picker'] as const,
    queryFn: () => listStudents({ pageSize: 200 }),
  });

  const [open, setOpen] = useState(false);
  const [toResolve, setToResolve] = useState<DisciplineIncident | null>(null);
  const [toDelete, setToDelete] = useState<DisciplineIncident | null>(null);

  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState<DisciplineSeverity>('MINOR');
  const [occurredAt, setOccurredAt] = useState(today());
  const [description, setDescription] = useState('');
  const [sanction, setSanction] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];
  const studentOptions = useMemo<PickerOption[]>(
    () =>
      (studentsData?.items ?? []).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
    [studentsData],
  );

  function resetForm() {
    setStudentId('');
    setType('MINOR');
    setOccurredAt(today());
    setDescription('');
    setSanction('');
    setErrors({});
  }

  const createM = useMutation({
    mutationFn: () =>
      createDiscipline({
        studentId,
        type,
        occurredAt: new Date(occurredAt).toISOString(),
        description: description.trim(),
        sanction: sanction.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DISCIPLINE_KEY });
      setOpen(false);
      resetForm();
    },
  });

  const resolveM = useMutation({
    mutationFn: (id: string) => resolveDiscipline(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DISCIPLINE_KEY });
      setToResolve(null);
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteDiscipline(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DISCIPLINE_KEY });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!studentId) e.studentId = 'Élève requis';
    if (!DATE_RE.test(occurredAt)) e.occurredAt = 'Format AAAA-MM-JJ';
    if (!description.trim()) e.description = 'Description requise';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {isLoading ? (
          <View style={{ gap: 10 }} accessibilityRole="progressbar">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={72} radius={radius.lg} />
            ))}
          </View>
        ) : isError ? (
          <ErrorState
            message="Impossible de charger la discipline."
            onRetry={() => {
              void refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="warning-outline" title="Aucun incident" description="Signalez un incident avec le bouton +." />
        ) : (
          items.map((i) => (
            <View
              key={i.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
                  {i.studentName}
                </Text>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    backgroundColor: SEVERITY_COLOR[i.type] + '22',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: SEVERITY_COLOR[i.type] }}>
                    {SEVERITY_LABELS[i.type]}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 4 }}>
                {fmtDate(i.occurredAt)} · {i.status === 'RESOLVED' ? 'Résolu' : 'Ouvert'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 6 }}>{i.description}</Text>
              {i.sanction ? (
                <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 4 }}>
                  Sanction : {i.sanction}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                {i.status === 'OPEN' ? (
                  <Pressable onPress={() => setToResolve(i)} hitSlop={6}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#16a34a' }}>
                      Marquer résolu
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setToDelete(i)} hitSlop={6}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.status.danger500 }}>
                    Supprimer
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Signaler un incident" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Nouvel incident"
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Signaler" onPress={submit} loading={createM.isPending} />
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
          placeholder={studentOptions.length ? 'Choisir…' : 'Aucun élève'}
          disabled={studentOptions.length === 0}
        />
        <Picker label="Gravité" required value={type} onChange={(v) => setType(v as DisciplineSeverity)} options={SEVERITY_OPTIONS} />
        <FormField
          label="Date"
          required
          value={occurredAt}
          onChangeText={setOccurredAt}
          error={errors.occurredAt}
          placeholder="AAAA-MM-JJ"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
        <FormField
          label="Description"
          required
          value={description}
          onChangeText={setDescription}
          error={errors.description}
          placeholder="Ce qui s'est passé…"
        />
        <FormField label="Sanction" value={sanction} onChangeText={setSanction} placeholder="Optionnel" />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      <ConfirmDialog
        visible={!!toResolve}
        title="Marquer comme résolu ?"
        message={toResolve ? `Incident de ${toResolve.studentName}` : ''}
        confirmLabel="Résoudre"
        loading={resolveM.isPending}
        onConfirm={() => toResolve && resolveM.mutate(toResolve.id)}
        onCancel={() => setToResolve(null)}
      />

      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer cet incident ?"
        message={toDelete ? `Incident de ${toDelete.studentName}` : ''}
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}
