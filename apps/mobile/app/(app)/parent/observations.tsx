import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, Text, View, ActivityIndicator } from 'react-native';

import { Button, EmptyState, colors, radius } from '@klasso/ui-mobile';
import {
  categoryColor,
  categoryLabel,
  formatObservedAt,
  useObservations,
  type Observation,
  type ObservationMedia,
} from '@/lib/api/observations';
import { useAuthStore } from '@/lib/auth/store';

/**
 * G3 — Fil d'observations (parent, lecture seule). Liste chronologique des
 * observations des enfants du parent connecté (scopées côté serveur).
 */
export default function ParentObservationsScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError, refetch } = useObservations(role);
  const items = data ?? [];

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
      ) : items.length === 0 ? (
        <EmptyState
          icon="eye-outline"
          title="Aucune observation"
          description="Les observations partagées par l'équipe pédagogique apparaîtront ici."
        />
      ) : (
        items.map((obs) => <ObservationCard key={obs.id} observation={obs} />)
      )}
    </ScrollView>
  );
}

function ObservationCard({ observation }: { observation: Observation }) {
  const accent = categoryColor(observation.category);
  return (
    <View
      accessibilityLabel={`${categoryLabel(observation.category)} : ${observation.title}, ${formatObservedAt(observation.observedAt)}`}
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
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
          <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>
            {categoryLabel(observation.category)}
          </Text>
        </View>
        <Text style={{ flex: 1, fontSize: 12, color: colors.ink[500], textAlign: 'right' }}>
          {formatObservedAt(observation.observedAt)}
        </Text>
      </View>

      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900], marginTop: 8 }}>
        {observation.title}
      </Text>
      {observation.content ? (
        <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 4 }} numberOfLines={4}>
          {observation.content}
        </Text>
      ) : null}

      {observation.media.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {observation.media.map((m) => (
            <MediaThumb key={m.id} media={m} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const THUMB_SIZE = 72;

function MediaThumb({ media }: { media: ObservationMedia }) {
  if (media.kind === 'PHOTO') {
    return (
      <Image
        source={{ uri: media.url }}
        accessibilityLabel="Photo de l'observation"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: radius.md,
          backgroundColor: colors.paper[50],
        }}
      />
    );
  }
  return (
    <View
      accessibilityLabel="Vidéo de l'observation"
      style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: radius.md,
        backgroundColor: colors.ink[900] + '0d',
        borderWidth: 1,
        borderColor: colors.paper[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="play-circle-outline" size={28} color={colors.ink[500]} />
    </View>
  );
}
