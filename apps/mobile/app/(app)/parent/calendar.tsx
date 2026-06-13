import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, colors, radius } from '@klasso/ui-mobile';
import {
  calendarTypeColor,
  calendarTypeLabel,
  formatEventRange,
  useCalendar,
  type CalendarEvent,
} from '@/lib/api/calendar';
import { useAuthStore } from '@/lib/auth/store';

/**
 * G8 — Calendrier scolaire (parent, lecture seule). Agenda chronologique des
 * vacances, jours fériés, événements, examens et réunions de l'établissement.
 */
export default function ParentCalendarScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError, refetch } = useCalendar(role);

  const events = [...(data ?? [])].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : isError ? (
        <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }}>
          <Text style={{ color: colors.status.danger500, fontSize: 14 }}>Erreur de chargement.</Text>
          <View style={{ width: 160 }}>
            <Button label="Réessayer" variant="secondary" onPress={() => void refetch()} />
          </View>
        </View>
      ) : events.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Aucun événement"
          description="Le calendrier scolaire de l'établissement apparaîtra ici."
        />
      ) : (
        events.map((event) => <CalendarCard key={event.id} event={event} />)
      )}
    </ScrollView>
  );
}

function CalendarCard({ event }: { event: CalendarEvent }) {
  const accent = calendarTypeColor(event.type);
  const typeLabel = calendarTypeLabel(event.type);
  const range = formatEventRange(event.startDate, event.endDate);

  return (
    <View
      accessibilityLabel={`${typeLabel} : ${event.title}, ${range}`}
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        borderLeftWidth: 4,
        borderLeftColor: accent,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: accent + '18',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>{typeLabel}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 12, color: colors.ink[500], textAlign: 'right' }}>
          {event.schoolYear}
        </Text>
      </View>

      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900], marginTop: 8 }}>
        {event.title}
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 4 }}>{range}</Text>

      {event.notes ? (
        <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 6 }} numberOfLines={4}>
          {event.notes}
        </Text>
      ) : null}
    </View>
  );
}
