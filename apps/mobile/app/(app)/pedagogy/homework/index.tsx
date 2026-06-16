import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState, ErrorState, Fab, Skeleton, colors, radius } from '@klasso/ui-mobile';
import { useHomeworkList, type Homework } from '@/lib/api/homework';

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function HomeworkListScreen() {
  const { data, isLoading, isError, refetch } = useHomeworkList();
  const items = data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {isLoading ? (
          <View style={{ gap: 10 }} accessibilityRole="progressbar">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={92} radius={radius.lg} />
            ))}
          </View>
        ) : isError ? (
          <ErrorState
            message="Impossible de charger les devoirs."
            onRetry={() => {
              void refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="reader-outline" title="Aucun devoir" description="Créez un devoir avec le bouton +." />
        ) : (
          items.map((hw: Homework) => {
            const done = hw.submissionCount > 0 && hw.submittedCount === hw.submissionCount;
            return (
              <Pressable
                key={hw.id}
                onPress={() => router.push({ pathname: '/(app)/pedagogy/homework/[id]', params: { id: hw.id } })}
                accessibilityRole="button"
                accessibilityLabel={`Suivi de ${hw.title}`}
                style={{
                  backgroundColor: colors.white,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.paper[100],
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>{hw.title}</Text>
                <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 3 }}>
                  {hw.className}
                  {hw.subjectName ? ` · ${hw.subjectName}` : ''} · échéance {fmt(hw.dueDate)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: (done ? colors.status.success500 : colors.ambre[600]) + '18',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: done ? colors.status.success500 : colors.ambre[600] }}>
                      {hw.submittedCount} rendu{hw.submittedCount > 1 ? 's' : ''}
                    </Text>
                  </View>
                  {hw.attachmentUrl ? (
                    <Text style={{ fontSize: 11, color: colors.ink[300] }}>📎 pièce jointe</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Fab label="Nouveau devoir" extended onPress={() => router.push('/(app)/pedagogy/homework/new')} />
    </View>
  );
}
