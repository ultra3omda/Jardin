import { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';

import { useJournal, type DailyLogEntry, type ChildMood } from '@/lib/api/school-life';
import { useAuthStore } from '@/lib/auth/store';
import { JournalComposer } from '@/components/school-life/journal-composer';
import { EmptyView } from '@/components/ui/empty-view';
import { ErrorView } from '@/components/ui/error-view';
import { CardSkeleton } from '@/components/ui/card-skeleton';

const MOOD: Record<ChildMood, { emoji: string; label: string }> = {
  HAPPY: { emoji: '😊', label: 'Joyeux' },
  CALM: { emoji: '😌', label: 'Calme' },
  TIRED: { emoji: '😴', label: 'Fatigué' },
  UPSET: { emoji: '😟', label: 'Contrarié' },
  SICK: { emoji: '🤒', label: 'Malade' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink[500], width: 90 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[700], flex: 1 }}>{value}</Text>
    </View>
  );
}

function JournalCard({ entry }: { entry: DailyLogEntry }) {
  const mood = entry.mood ? MOOD[entry.mood] : null;
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink[900] }}>
          {entry.studentName}
        </Text>
        {mood && <Text style={{ fontSize: 18 }}>{mood.emoji}</Text>}
      </View>
      <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 2, textTransform: 'capitalize' }}>
        {formatDate(entry.date)}
      </Text>

      {mood && <Row label="Humeur" value={mood.label} />}
      {entry.meals ? <Row label="Repas" value={entry.meals} /> : null}
      {entry.nap ? <Row label="Sieste" value={entry.nap} /> : null}
      {entry.bathroom ? <Row label="Propreté" value={entry.bathroom} /> : null}
      {entry.activitiesNote ? <Row label="Activités" value={entry.activitiesNote} /> : null}
      {entry.generalNote ? <Row label="Mot du jour" value={entry.generalNote} /> : null}
    </View>
  );
}

export function JournalSection() {
  const { data, isLoading, isError, refetch } = useJournal();
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'TEACHER' || role === 'SCHOOL_ADMIN';
  const [composerOpen, setComposerOpen] = useState(false);
  const entries = data?.items ?? [];

  const addButton = canWrite ? (
    <Pressable
      onPress={() => setComposerOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Ajouter une entrée au journal"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.ambre[50],
        borderWidth: 1,
        borderColor: colors.ambre[100],
        borderRadius: radius.lg,
        paddingVertical: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ambre[700] }}>
        + Nouvelle entrée
      </Text>
    </Pressable>
  ) : null;

  const composer = canWrite ? (
    <JournalComposer visible={composerOpen} onClose={() => setComposerOpen(false)} />
  ) : null;

  if (isLoading) {
    return (
      <View style={{ gap: 10 }}>
        <CardSkeleton height={120} />
        <CardSkeleton height={120} />
      </View>
    );
  }
  if (isError) {
    return <ErrorView message="Impossible de charger le journal." onRetry={() => void refetch()} />;
  }
  if (entries.length === 0) {
    return (
      <View>
        {addButton}
        <EmptyView
          icon="📓"
          title="Aucune entrée"
          subtitle={
            canWrite
              ? 'Ajoutez la première entrée du cahier de liaison.'
              : "Le cahier de liaison sera mis à jour par l'équipe."
          }
        />
        {composer}
      </View>
    );
  }

  return (
    <View>
      {addButton}
      {entries.map((e) => (
        <JournalCard key={e.id} entry={e} />
      ))}
      {composer}
    </View>
  );
}
