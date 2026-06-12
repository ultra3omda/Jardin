import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, FormField, Picker, colors, radius, type PickerOption } from '@klasso/ui-mobile';
import {
  OBSERVATION_CATEGORIES,
  canWriteObservation,
  useCreateObservation,
  type ObservationCategory,
} from '@/lib/api/observations';
import { listStudents } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/store';

/**
 * G3 — Saisie rapide d'une observation (enseignant / admin). Sélection d'un
 * élève, d'une catégorie, titre + contenu, visibilité parent. Crée via
 * useCreateObservation puis affiche une bannière de succès.
 */
export default function ManageObservationsScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const createM = useCreateObservation();

  const studentsQuery = useQuery({
    queryKey: ['students', 'picker'],
    queryFn: () => listStudents({ pageSize: 200 }),
    enabled: canWriteObservation(role),
    staleTime: 60_000,
  });

  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState<ObservationCategory>('LANGAGE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibleToParent, setVisibleToParent] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const studentOptions: PickerOption[] = useMemo(
    () =>
      (studentsQuery.data?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.firstName} ${s.lastName}`,
        hint: s.class?.name ?? s.classroom,
      })),
    [studentsQuery.data],
  );

  const categoryOptions: PickerOption[] = OBSERVATION_CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
  }));

  function submit(): void {
    if (!studentId) {
      setFormError('Sélectionnez un élève.');
      return;
    }
    if (title.trim().length === 0) {
      setFormError('Saisissez un titre.');
      return;
    }
    if (content.trim().length === 0) {
      setFormError('Saisissez le contenu de l’observation.');
      return;
    }
    setFormError(null);
    setCreated(false);
    createM.mutate(
      {
        studentId,
        category,
        title: title.trim(),
        content: content.trim(),
        observedAt: new Date().toISOString(),
        visibleToParent,
      },
      {
        onSuccess: () => {
          setCreated(true);
          setTitle('');
          setContent('');
          setStudentId('');
          setCategory('LANGAGE');
          setVisibleToParent(true);
        },
        onError: () => {
          setFormError('L’enregistrement a échoué. Réessayez.');
        },
      },
    );
  }

  if (!canWriteObservation(role)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
        <EmptyState
          icon="lock-closed-outline"
          title="Accès réservé"
          description="La saisie d'observations est réservée aux enseignants et à l'administration."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {created ? (
          <View
            accessibilityRole="alert"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: colors.status.success500 + '18',
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.status.success500 + '33',
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.status.success500} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.status.success500 }}>
              Observation enregistrée.
            </Text>
          </View>
        ) : null}

        <Picker
          label="Élève"
          required
          value={studentId}
          onChange={(v) => setStudentId(v)}
          options={studentOptions}
          placeholder={studentsQuery.isLoading ? 'Chargement…' : 'Sélectionner un élève'}
          disabled={studentsQuery.isLoading || studentOptions.length === 0}
          emptyText="Aucun élève."
        />

        <Picker
          label="Catégorie"
          required
          value={category}
          onChange={(v) => setCategory(v as ObservationCategory)}
          options={categoryOptions}
        />

        <FormField
          label="Titre"
          required
          value={title}
          onChangeText={setTitle}
          placeholder="Ex. Progrès en motricité fine"
          maxLength={120}
        />

        <FormField
          label="Observation"
          required
          value={content}
          onChangeText={setContent}
          placeholder="Décrivez l'observation…"
          multiline
          numberOfLines={5}
        />

        <Button
          label={visibleToParent ? 'Visible par les parents ✓' : 'Masquée aux parents'}
          variant="secondary"
          onPress={() => setVisibleToParent((v) => !v)}
          accessibilityLabel="Basculer la visibilité parent"
        />

        {formError ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500, marginTop: 12 }}>
            {formError}
          </Text>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <Button
            label="Enregistrer l'observation"
            onPress={submit}
            loading={createM.isPending}
            accessibilityLabel="Enregistrer l'observation"
          />
        </View>
      </ScrollView>
    </View>
  );
}
