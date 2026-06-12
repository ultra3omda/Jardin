import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, colors, radius } from '@klasso/ui-mobile';
import {
  activityCategoryColor,
  activityCategoryLabel,
  formatActivityDate,
  openActivityReportPdf,
  useActivities,
  useActivityReport,
  type Activity,
} from '@/lib/api/activities';
import { useAuthStore } from '@/lib/auth/store';

/**
 * G5 — Cahier d'activités (parent, lecture seule). Liste des activités des
 * enfants du parent connecté (scopées côté serveur), avec rapport PDF
 * téléchargeable quand il existe.
 */
export default function ParentActivitiesScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError, refetch } = useActivities(role);
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
          icon="color-palette-outline"
          title="Aucune activité"
          description="Les ateliers et sorties partagés par l'équipe apparaîtront ici."
        />
      ) : (
        items.map((activity) => <ActivityCard key={activity.id} activity={activity} />)
      )}
    </ScrollView>
  );
}

const THUMB_SIZE = 72;

function ActivityCard({ activity }: { activity: Activity }) {
  const accent = activityCategoryColor(activity.category);
  const report = useActivityReport(activity.id, true);
  const hasReport = report.data != null;

  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    if (opening) return;
    setError(null);
    setOpening(true);
    try {
      const ok = await openActivityReportPdf(activity.id);
      if (!ok) setError('Impossible d’ouvrir le PDF.');
    } catch {
      setError('Rapport indisponible. Réessayez.');
    } finally {
      setOpening(false);
    }
  }

  const photoUrls = report.data?.photoUrls ?? [];

  return (
    <View
      accessibilityLabel={`${activityCategoryLabel(activity.category)} : ${activity.name}, ${formatActivityDate(activity.scheduledAt)}`}
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
            {activityCategoryLabel(activity.category)}
          </Text>
        </View>
        <Text style={{ flex: 1, fontSize: 12, color: colors.ink[500], textAlign: 'right' }}>
          {formatActivityDate(activity.scheduledAt)}
        </Text>
      </View>

      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900], marginTop: 8 }}>
        {activity.name}
      </Text>

      {activity.location ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="location-outline" size={13} color={colors.ink[500]} />
          <Text style={{ fontSize: 12, color: colors.ink[500] }}>{activity.location}</Text>
        </View>
      ) : null}

      {report.data?.summary ? (
        <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 6 }} numberOfLines={4}>
          {report.data.summary}
        </Text>
      ) : null}

      {photoUrls.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {photoUrls.map((url) => (
            <Image
              key={url}
              source={{ uri: url }}
              accessibilityLabel="Photo de l'activité"
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: radius.md,
                backgroundColor: colors.paper[50],
              }}
            />
          ))}
        </View>
      ) : null}

      {/* Rapport PDF — affiché seulement si un rapport visible existe. */}
      {report.isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
      ) : hasReport ? (
        <Pressable
          onPress={() => void handleOpen()}
          disabled={opening}
          accessibilityRole="button"
          accessibilityState={{ disabled: opening, busy: opening }}
          accessibilityLabel={`Voir le rapport PDF de ${activity.name}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
            marginTop: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: colors.ambre[50],
            borderWidth: 1,
            borderColor: colors.ambre[100],
            opacity: opening ? 0.6 : 1,
          }}
        >
          {opening ? (
            <ActivityIndicator size="small" color={colors.ambre[600]} />
          ) : (
            <Ionicons name="document-text-outline" size={16} color={colors.ambre[600]} />
          )}
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ambre[600] }}>
            Voir le rapport (PDF)
          </Text>
        </Pressable>
      ) : null}

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontSize: 12, color: colors.status.danger500, marginTop: 8 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
