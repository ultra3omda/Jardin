import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, ConfirmDialog, EmptyState, ErrorState, Fab, FormField, FormSheet, Picker, Skeleton, colors, radius } from '@klasso/ui-mobile';
import {
  DRILL_TYPE_LABELS,
  DRILL_TYPE_OPTIONS,
  SAFETY_DRILLS_KEY,
  createSafetyDrill,
  deleteSafetyDrill,
  listSafetyDrills,
  type DrillType,
  type SafetyDrill,
} from '@/lib/api/security';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
};

export function DrillsTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: SAFETY_DRILLS_KEY, queryFn: listSafetyDrills });
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SafetyDrill | null>(null);

  const [type, setType] = useState<DrillType>('FIRE');
  const [conductedAt, setConductedAt] = useState(today());
  const [durationMin, setDurationMin] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  const createM = useMutation({
    mutationFn: () =>
      createSafetyDrill({
        type,
        conductedAt: new Date(conductedAt).toISOString(),
        durationMin: durationMin ? parseInt(durationMin, 10) : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SAFETY_DRILLS_KEY });
      setOpen(false);
      setConductedAt(today());
      setDurationMin('');
      setNotes('');
      setErrors({});
    },
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteSafetyDrill(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SAFETY_DRILLS_KEY });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!DATE_RE.test(conductedAt)) e.conductedAt = 'Format AAAA-MM-JJ';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {isLoading ? (
          <View style={{ gap: 10 }} accessibilityRole="progressbar">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={72} radius={radius.lg} />
            ))}
          </View>
        ) : isError ? (
          <ErrorState
            message="Impossible de charger les exercices."
            onRetry={() => {
              void refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="alarm-outline" title="Aucun exercice" description="Enregistrez un exercice avec +." />
        ) : (
          items.map((d) => (
            <View key={d.id} style={{ backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.paper[100], padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
                  {DRILL_TYPE_LABELS[d.type]}
                </Text>
                <Pressable onPress={() => setToDelete(d)} hitSlop={6}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.status.danger500 }}>Suppr.</Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 4 }}>
                {fmt(d.conductedAt)}
                {d.durationMin ? ` · ${d.durationMin} min` : ''}
              </Text>
              {d.notes ? <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 4 }}>{d.notes}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouvel exercice" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Nouvel exercice"
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} /></View>
            <View style={{ flex: 1 }}><Button label="Enregistrer" onPress={submit} loading={createM.isPending} /></View>
          </View>
        }
      >
        <Picker label="Type" required value={type} onChange={(v) => setType(v as DrillType)} options={DRILL_TYPE_OPTIONS} />
        <FormField label="Date" required value={conductedAt} onChangeText={setConductedAt} error={errors.conductedAt} placeholder="AAAA-MM-JJ" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
        <FormField label="Durée (min)" value={durationMin} onChangeText={(v) => setDurationMin(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Optionnel" />
        <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optionnel" />
        {createM.error ? <Text style={{ fontSize: 13, color: colors.status.danger500 }}>Erreur : {(createM.error as Error).message}</Text> : null}
      </FormSheet>

      <ConfirmDialog visible={!!toDelete} title="Supprimer cet exercice ?" message={toDelete ? DRILL_TYPE_LABELS[toDelete.type] : ''} confirmLabel="Supprimer" destructive loading={deleteM.isPending} onConfirm={() => toDelete && deleteM.mutate(toDelete.id)} onCancel={() => setToDelete(null)} />
    </View>
  );
}
