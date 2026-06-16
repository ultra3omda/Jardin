import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

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
  createActivity,
  deleteActivity,
  SCHOOL_LIFE_KEYS,
  useActivities,
  type Activity,
  type ActivityCategory,
} from '@/lib/api/school-life';
import { useMyClasses } from '@/lib/api/classes';

const CATEGORY_OPTIONS: PickerOption[] = [
  { value: 'ART', label: '🎨 Art' },
  { value: 'MUSIC', label: '🎵 Musique' },
  { value: 'SPORT', label: '⚽ Sport' },
  { value: 'OUTING', label: '🚌 Sortie' },
  { value: 'OTHER', label: '✨ Autre' },
];

export default function ManageActivitiesScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useActivities();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Activity | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('ART');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: classes } = useMyClasses(false);
  const classOptions = useMemo<PickerOption[]>(
    () => (classes ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.level })),
    [classes],
  );

  const items = data?.items ?? [];

  const createM = useMutation({
    mutationFn: () =>
      createActivity({
        name: name.trim(),
        category: category as ActivityCategory,
        location: location || undefined,
        description: description || undefined,
        classId: classId || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SCHOOL_LIFE_KEYS.activities });
      setOpen(false);
      setName('');
      setLocation('');
      setDescription('');
      setClassId('');
      setErrors({});
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SCHOOL_LIFE_KEYS.activities });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nom requis';
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
            message="Impossible de charger les activités."
            onRetry={() => {
              void refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="color-palette-outline" title="Aucune activité" description="Ajoutez-en une avec le bouton +." />
        ) : (
          items.map((a) => (
            <View
              key={a.id}
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
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink[900] }}>{a.name}</Text>
                <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>
                  {a.location ? `${a.location} · ` : ''}
                  {a.participantCount} participant{a.participantCount > 1 ? 's' : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => setToDelete(a)}
                accessibilityRole="button"
                accessibilityLabel={`Supprimer ${a.name}`}
                hitSlop={8}
              >
                <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>
                  Supprimer
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouvelle activité" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Nouvelle activité"
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Créer" onPress={submit} loading={createM.isPending} />
            </View>
          </View>
        }
      >
        <FormField label="Nom" required value={name} onChangeText={setName} error={errors.name} placeholder="Atelier peinture" />
        <Picker label="Catégorie" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
        <Picker
          label="Classe (participants = présents du jour)"
          value={classId}
          onChange={setClassId}
          options={classOptions}
          placeholder="(optionnel)"
        />
        <FormField label="Lieu" value={location} onChangeText={setLocation} placeholder="Salle d'éveil" />
        <FormField label="Description" value={description} onChangeText={setDescription} multiline />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer cette activité ?"
        message={`${toDelete?.name ?? ''} sera retirée.`}
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}
