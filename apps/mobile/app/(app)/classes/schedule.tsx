import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState, ScheduleGrid, colors } from '@klasso/ui-mobile';
import { useMySchedule } from '@/lib/api/classes';

/**
 * Mon emploi du temps (enseignant / animatrice) — créneaux agrégés sur toutes
 * ses classes, dans la même grille jour × créneau que le web et les parents.
 */
export default function TeacherScheduleScreen() {
  const { data, isLoading, isError, refetch } = useMySchedule();
  const slots = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : isError ? (
        <Pressable onPress={() => void refetch()} style={{ marginTop: 24 }}>
          <Text style={{ color: colors.status.danger500, textAlign: 'center' }}>
            Erreur de chargement. Toucher pour réessayer.
          </Text>
        </Pressable>
      ) : slots.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Aucun créneau"
          description="Aucun créneau ne vous est affecté pour l'instant."
        />
      ) : (
        <View>
          <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 12 }}>
            Vos créneaux, toutes classes confondues.
          </Text>
          <ScheduleGrid slots={slots} secondary="class" />
        </View>
      )}
    </ScrollView>
  );
}
