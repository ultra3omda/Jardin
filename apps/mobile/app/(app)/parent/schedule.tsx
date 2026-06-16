import { ScrollView, Text, View } from 'react-native';

import { EmptyState, ErrorState, ScheduleGrid, Skeleton, colors, radius } from '@klasso/ui-mobile';
import { useClassDetail } from '@/lib/api/classes';
import { useMyChildren, type MyChild } from '@/lib/api/parent';

/** Emploi du temps des enfants — même grille jour × créneau que le web. */
export default function ParentScheduleScreen() {
  const { data: children, isLoading, isError, refetch } = useMyChildren();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {isLoading ? (
        <View style={{ gap: 12 }} accessibilityRole="progressbar">
          {[0, 1].map((i) => (
            <Skeleton key={i} height={120} radius={radius.lg} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState
          message="Impossible de charger l'emploi du temps."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : !children || children.length === 0 ? (
        <EmptyState icon="calendar-outline" title="Aucun enfant" description="Aucun emploi du temps disponible." />
      ) : (
        children.map((child) => <ChildSchedule key={child.id} child={child} />)
      )}
    </ScrollView>
  );
}

function ChildSchedule({ child }: { child: MyChild }) {
  const { data, isLoading } = useClassDetail(child.classId ?? '');
  const slots = data?.timeSlots ?? [];

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink[900], marginBottom: 2 }}>
        {child.firstName} {child.lastName}
      </Text>
      <Text style={{ fontSize: 12, color: colors.ink[500], marginBottom: 10 }}>
        {child.className ?? 'Classe non assignée'}
      </Text>

      {!child.classId ? (
        <Text style={{ fontSize: 13, color: colors.ink[300] }}>Pas de classe rattachée.</Text>
      ) : isLoading ? (
        <Skeleton height={96} radius={radius.lg} />
      ) : slots.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.ink[300] }}>Emploi du temps non encore renseigné.</Text>
      ) : (
        <ScheduleGrid slots={slots} secondary="room" />
      )}
    </View>
  );
}
