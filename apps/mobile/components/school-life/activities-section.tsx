import { View, Text } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';

import { useActivities, type Activity, type ActivityCategory } from '@/lib/api/school-life';
import { EmptyView } from '@/components/ui/empty-view';
import { ErrorView } from '@/components/ui/error-view';
import { CardSkeleton } from '@/components/ui/card-skeleton';

const CATEGORY: Record<ActivityCategory, { emoji: string; label: string }> = {
  ART: { emoji: '🎨', label: 'Art' },
  MUSIC: { emoji: '🎵', label: 'Musique' },
  SPORT: { emoji: '⚽', label: 'Sport' },
  OUTING: { emoji: '🚌', label: 'Sortie' },
  OTHER: { emoji: '✨', label: 'Autre' },
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ActivityCard({ activity }: { activity: Activity }) {
  const cat = CATEGORY[activity.category];
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.paper[100],
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900], flex: 1 }}>
          {activity.name}
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 4 }}>
        {cat.label}
        {activity.scheduledAt ? ` · ${formatWhen(activity.scheduledAt)}` : ''}
        {activity.durationMin ? ` · ${activity.durationMin} min` : ''}
      </Text>
      {activity.location ? (
        <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>
          📍 {activity.location}
        </Text>
      ) : null}
      {activity.description ? (
        <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 6, lineHeight: 18 }}>
          {activity.description}
        </Text>
      ) : null}
      <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 8 }}>
        {activity.participantCount} participant{activity.participantCount > 1 ? 's' : ''}
      </Text>
    </View>
  );
}

export function ActivitiesSection() {
  const { data, isLoading, isError, refetch } = useActivities();
  const activities = data?.items ?? [];

  if (isLoading) {
    return (
      <View style={{ gap: 10 }}>
        <CardSkeleton height={100} />
        <CardSkeleton height={100} />
      </View>
    );
  }
  if (isError) {
    return <ErrorView message="Impossible de charger les activités." onRetry={() => void refetch()} />;
  }
  if (activities.length === 0) {
    return (
      <EmptyView
        icon="🎨"
        title="Aucune activité"
        subtitle="Le programme d'activités apparaîtra ici."
      />
    );
  }

  return (
    <View>
      {activities.map((a) => (
        <ActivityCard key={a.id} activity={a} />
      ))}
    </View>
  );
}
