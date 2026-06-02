import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState, colors, radius } from '@klasso/ui-mobile';
import { submissionLabel, useChildrenHomework, type SubmissionStatus } from '@/lib/api/homework';

const STATUS_COLOR: Record<SubmissionStatus, string> = {
  PENDING: '#d97706',
  SUBMITTED: '#059669',
  LATE: '#ef4444',
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
}

/** Devoirs des enfants du parent, avec l'échéance et le statut de chacun. */
export default function ParentHomeworkScreen() {
  const { data, isLoading, isError } = useChildrenHomework();
  const items = data?.items ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : isError ? (
        <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
      ) : items.length === 0 ? (
        <EmptyState icon="reader-outline" title="Aucun devoir" description="Aucun devoir à venir pour vos enfants." />
      ) : (
        items.map((hw) => (
          <View
            key={`${hw.id}-${hw.studentId}`}
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
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>{hw.title}</Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: STATUS_COLOR[hw.status] + '18',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: STATUS_COLOR[hw.status] }}>
                  {submissionLabel(hw.status)}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 3 }}>
              {hw.studentName} · {hw.className}
              {hw.subjectName ? ` · ${hw.subjectName}` : ''}
            </Text>
            <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 8 }}>{hw.instructions}</Text>
            <Text style={{ fontSize: 12, color: colors.ambre[700], fontWeight: '600', marginTop: 8, textTransform: 'capitalize' }}>
              À rendre : {fmt(hw.dueDate)}
            </Text>
            {hw.attachmentUrl ? (
              <Pressable
                onPress={() => hw.attachmentUrl && void Linking.openURL(hw.attachmentUrl)}
                accessibilityRole="link"
                accessibilityLabel="Ouvrir la pièce jointe"
                style={{ marginTop: 8 }}
              >
                <Text style={{ fontSize: 13, color: colors.ambre[600], fontWeight: '600' }}>📎 Pièce jointe</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}
