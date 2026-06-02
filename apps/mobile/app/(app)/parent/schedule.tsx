import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { EmptyState, ScheduleGrid, colors } from '@klasso/ui-mobile';
import { useClassDetail } from '@/lib/api/classes';
import { useMyChildren, type MyChild } from '@/lib/api/parent';

/** Emploi du temps des enfants — même grille jour × créneau que le web. */
export default function ParentScheduleScreen() {
  const { data: children, isLoading, isError } = useMyChildren();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : isError ? (
        <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
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
        <ActivityIndicator color={colors.ambre[500]} />
      ) : slots.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.ink[300] }}>Emploi du temps non encore renseigné.</Text>
      ) : (
        <ScheduleGrid slots={slots} secondary="room" />
      )}
    </View>
  );
}
