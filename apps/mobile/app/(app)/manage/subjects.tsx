import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  ConfirmDialog,
  EmptyState,
  Fab,
  FormField,
  FormSheet,
  colors,
  radius,
} from '@klasso/ui-mobile';
import {
  createSubject,
  updateSubject,
  deleteSubject,
  SUBJECTS_KEY,
  useSubjects,
  type Subject,
} from '@/lib/api/subjects';

export default function ManageSubjectsScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useSubjects();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [toDelete, setToDelete] = useState<Subject | null>(null);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [coefficient, setCoefficient] = useState('1');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  function resetForm() {
    setName('');
    setEmoji('');
    setCoefficient('1');
    setErrors({});
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setOpen(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setName(s.name);
    setEmoji(s.emoji ?? '');
    setCoefficient(String(s.coefficient));
    setErrors({});
    setOpen(true);
  }

  const payload = () => ({
    name: name.trim(),
    emoji: emoji.trim() || undefined,
    coefficient: parseFloat(coefficient) || 1,
  });

  const createM = useMutation({
    mutationFn: () => createSubject(payload()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SUBJECTS_KEY });
      setOpen(false);
      resetForm();
    },
  });

  const updateM = useMutation({
    mutationFn: () => updateSubject(editing!.id, payload()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SUBJECTS_KEY });
      setOpen(false);
      setEditing(null);
      resetForm();
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SUBJECTS_KEY });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nom requis';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (editing) updateM.mutate();
    else createM.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
        ) : items.length === 0 ? (
          <EmptyState icon="book-outline" title="Aucune matière" description="Ajoutez-en une avec le bouton +." />
        ) : (
          items.map((s) => (
            <View
              key={s.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink[900] }}>
                {s.emoji ? `${s.emoji} ` : ''}
                {s.name}
                <Text style={{ color: colors.ink[300], fontWeight: '400' }}>  · coef {s.coefficient}</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 14, marginLeft: 8 }}>
                <Pressable
                  onPress={() => openEdit(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier ${s.name}`}
                  hitSlop={8}
                >
                  <Text style={{ color: colors.ambre[700], fontWeight: '600', fontSize: 13 }}>Éditer</Text>
                </Pressable>
                <Pressable
                  onPress={() => setToDelete(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${s.name}`}
                  hitSlop={8}
                >
                  <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>
                    Supprimer
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouvelle matière" extended onPress={openCreate} />

      <FormSheet
        visible={open}
        title={editing ? 'Modifier la matière' : 'Nouvelle matière'}
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={editing ? 'Enregistrer' : 'Créer'}
                onPress={submit}
                loading={createM.isPending || updateM.isPending}
              />
            </View>
          </View>
        }
      >
        <FormField label="Nom" required value={name} onChangeText={setName} error={errors.name} placeholder="Mathématiques" />
        <FormField label="Emoji" value={emoji} onChangeText={setEmoji} placeholder="🔢" />
        <FormField
          label="Coefficient"
          value={coefficient}
          onChangeText={(v) => setCoefficient(v.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          hint="De 1 à 10"
        />
        {createM.error || updateM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {((createM.error || updateM.error) as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer cette matière ?"
        message={`${toDelete?.name ?? ''} sera retirée du référentiel.`}
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}
