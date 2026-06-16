import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Button, EmptyState, ErrorState, Skeleton, colors, radius } from '@klasso/ui-mobile';
import {
  upsertGrade,
  useEvaluationDetail,
} from '@/lib/api/evaluations';
import { listStudents } from '@/lib/api/students';

/**
 * Lot 3 — Saisie des notes d'une évaluation (admin + enseignant).
 * Liste le roster de la classe ; chaque champ note est sauvegardé à la volée
 * (PUT /evaluations/:id/grades) au moment d'« Enregistrer ».
 */
export default function GradeEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const evaluationId = id!;
  const qc = useQueryClient();
  const detail = useEvaluationDetail(evaluationId);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const classId = detail.data?.evaluation.classId;
  const maxScore = detail.data?.evaluation.maxScore ?? 20;

  const roster = useQuery({
    queryKey: ['attendance-roster', classId],
    queryFn: () => listStudents({ classId: classId!, pageSize: 100 }),
    enabled: !!classId,
  });

  const students = useMemo(() => roster.data?.items ?? [], [roster.data]);

  // Seed inputs from existing grades.
  useEffect(() => {
    if (!students.length || !detail.data) return;
    const byStudent = new Map(detail.data.grades.map((g) => [g.studentId, g.score]));
    const next: Record<string, string> = {};
    for (const s of students) {
      const v = byStudent.get(s.id);
      next[s.id] = v !== undefined ? String(v) : '';
    }
    setScores(next);
  }, [students, detail.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      // Persist each filled-in score; skip empties.
      for (const s of students) {
        const raw = scores[s.id];
        if (raw === undefined || raw.trim() === '') continue;
        const score = parseFloat(raw);
        if (!Number.isFinite(score)) continue;
        await upsertGrade(evaluationId, s.id, score);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['evaluations', 'detail', evaluationId] });
      void qc.invalidateQueries({ queryKey: ['evaluations'] });
      setSaved(true);
    },
  });

  const loading = detail.isLoading || roster.isLoading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink[900] }}>
        {detail.data?.evaluation.title ?? 'Évaluation'}
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 16 }}>
        Note sur {maxScore} · {students.length} élève{students.length > 1 ? 's' : ''}
      </Text>

      {loading ? (
        <View style={{ gap: 8 }} accessibilityRole="progressbar">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={56} radius={radius.lg} />
          ))}
        </View>
      ) : detail.isError ? (
        <ErrorState
          message="Impossible de charger l'évaluation."
          onRetry={() => {
            void detail.refetch();
          }}
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Aucun élève"
          description="Aucun élève dans cette classe."
        />
      ) : (
        <View>
          {students.map((s) => (
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
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginBottom: 8,
              }}
            >
              <Text style={{ flex: 1, fontSize: 15, color: colors.ink[900] }}>
                {s.lastName} {s.firstName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TextInput
                  value={scores[s.id] ?? ''}
                  onChangeText={(v) => {
                    setScores((m) => ({ ...m, [s.id]: v.replace(/[^0-9.]/g, '') }));
                    setSaved(false);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors.ink[300]}
                  accessibilityLabel={`Note de ${s.firstName} ${s.lastName}`}
                  style={{
                    width: 56,
                    height: 40,
                    borderWidth: 1,
                    borderColor: colors.paper[100],
                    borderRadius: radius.md,
                    textAlign: 'center',
                    fontSize: 15,
                    fontWeight: '700',
                    color: colors.ink[900],
                  }}
                />
                <Text style={{ fontSize: 13, color: colors.ink[300] }}>/{maxScore}</Text>
              </View>
            </View>
          ))}

          {saved ? (
            <Text style={{ color: colors.status.success500, fontWeight: '600', marginVertical: 8 }}>
              ✓ Notes enregistrées.
            </Text>
          ) : null}
          {mutation.error ? (
            <Text style={{ color: colors.status.danger500, marginVertical: 8 }}>
              Erreur : {(mutation.error as Error).message}
            </Text>
          ) : null}

          <View style={{ marginTop: 8 }}>
            <Button
              label="Enregistrer les notes"
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
