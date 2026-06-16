import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState, ErrorState, Fab, Skeleton, colors, radius } from '@klasso/ui-mobile';
import { useEvaluations, type Evaluation } from '@/lib/api/evaluations';
import { useMyClasses } from '@/lib/api/classes';
import { useSubjects } from '@/lib/api/subjects';

/**
 * Lot 3 — Liste des évaluations gérables (admin + enseignant).
 * Tap → saisie des notes ; FAB → création.
 */
export default function EvaluationsListScreen() {
  const { data, isLoading, isError, refetch } = useEvaluations();
  const { data: classes } = useMyClasses(false);
  const { data: subjectsData } = useSubjects();

  const classNameById = useMemo(
    () => new Map((classes ?? []).map((c) => [c.id, c.name])),
    [classes],
  );
  const subjectNameById = useMemo(
    () => new Map((subjectsData?.items ?? []).map((s) => [s.id, s.name])),
    [subjectsData],
  );

  const evaluations = data?.items ?? [];

  function open(ev: Evaluation) {
    router.push({ pathname: '/(app)/pedagogy/evaluations/[id]', params: { id: ev.id } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 96 }}>
        {isLoading ? (
          <View style={{ gap: 10 }} accessibilityRole="progressbar">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={76} radius={radius.lg} />
            ))}
          </View>
        ) : isError ? (
          <ErrorState
            message="Impossible de charger les évaluations."
            onRetry={() => {
              void refetch();
            }}
          />
        ) : evaluations.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Aucune évaluation"
            description="Créez votre première évaluation avec le bouton +."
          />
        ) : (
          evaluations.map((ev) => (
            <Pressable
              key={ev.id}
              onPress={() => open(ev)}
              accessibilityRole="button"
              accessibilityLabel={`Saisir les notes de ${ev.title}`}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
                {ev.title}
              </Text>
              <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 3 }}>
                {classNameById.get(ev.classId) ?? 'Classe'} ·{' '}
                {subjectNameById.get(ev.subjectId) ?? 'Matière'} · /{ev.maxScore}
              </Text>
              <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 1 }}>
                {ev.date.slice(0, 10)}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Fab
        label="Nouvelle évaluation"
        extended
        onPress={() => router.push('/(app)/pedagogy/evaluations/new')}
      />
    </View>
  );
}
