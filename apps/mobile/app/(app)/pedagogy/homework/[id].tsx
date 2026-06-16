import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { ErrorState, Skeleton, colors, radius } from '@klasso/ui-mobile';
import {
  submissionLabel,
  useHomeworkDetail,
  useUpsertSubmission,
  type SubmissionStatus,
} from '@/lib/api/homework';

const STATUSES: { value: SubmissionStatus; color: string }[] = [
  { value: 'PENDING', color: colors.ink[500] },
  { value: 'SUBMITTED', color: colors.status.success500 },
  { value: 'LATE', color: colors.ambre[600] },
];

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
}

/** Détail d'un devoir + suivi des rendus par élève (enseignant/admin). */
export default function HomeworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const homeworkId = id!;
  const { data, isLoading, isError, refetch } = useHomeworkDetail(homeworkId);
  const upsert = useUpsertSubmission(homeworkId);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50], padding: 16, gap: 10 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={i === 0 ? 90 : 64} radius={radius.lg} />
        ))}
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50], padding: 20, justifyContent: 'center' }}>
        <ErrorState
          message="Impossible de charger le devoir."
          onRetry={() => {
            void refetch();
          }}
        />
      </View>
    );
  }

  const { homework, submissions } = data;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink[900] }}>{homework.title}</Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 2 }}>
        {homework.className}
        {homework.subjectName ? ` · ${homework.subjectName}` : ''} · échéance {fmt(homework.dueDate)}
      </Text>
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.paper[100],
          padding: 14,
          marginTop: 12,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink[300], textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Consigne
        </Text>
        <Text style={{ fontSize: 14, color: colors.ink[700] }}>{homework.instructions}</Text>
        {homework.attachmentUrl ? (
          <Pressable
            onPress={() => homework.attachmentUrl && void Linking.openURL(homework.attachmentUrl)}
            accessibilityRole="link"
            accessibilityLabel="Ouvrir la pièce jointe"
            style={{ marginTop: 10 }}
          >
            <Text style={{ fontSize: 13, color: colors.ambre[600], fontWeight: '600' }}>📎 Ouvrir la pièce jointe</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink[300], textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 10 }}>
        Suivi des rendus
      </Text>
      {submissions.map((s) => (
        <View
          key={s.studentId}
          style={{
            backgroundColor: colors.white,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.paper[100],
            padding: 12,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink[900], marginBottom: 8 }}>
            {s.studentName}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STATUSES.map((st) => {
              const active = s.status === st.value;
              return (
                <Pressable
                  key={st.value}
                  onPress={() => upsert.mutate({ studentId: s.studentId, status: st.value })}
                  disabled={upsert.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.studentName} : ${submissionLabel(st.value)}`}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: active ? st.color : colors.paper[50],
                    borderWidth: 1,
                    borderColor: active ? st.color : colors.paper[100],
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? colors.white : colors.ink[500] }}>
                    {submissionLabel(st.value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
