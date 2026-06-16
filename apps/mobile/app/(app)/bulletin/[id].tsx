import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { ScreenHeader, EmptyState, ErrorState, Skeleton, colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import { useMyGrades, type ChildGrades } from '@/lib/api/evaluations';
import { BulletinDownloads } from '@/components/bulletins/bulletin-downloads';

function gradeColor(grade: number): string {
  if (grade >= 14) return '#34d399';
  if (grade >= 10) return '#f2683f';
  return '#f87171';
}

function GradeChip({ value, outOf = 20 }: { value: number; outOf?: number }) {
  const color = gradeColor(value);
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: color + '14',
        borderWidth: 1,
        borderColor: color + '30',
      }}
    >
      <Text style={{ fontWeight: '700', fontSize: 14, color }}>
        {value}/{outOf}
      </Text>
    </View>
  );
}

function Releve({ child }: { child: ChildGrades }) {
  return (
    <View>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink[900] }}>{child.childName}</Text>
        <Text style={{ fontSize: 13, color: colors.ink[500] }}>{child.className}</Text>
        {child.average !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Text style={{ fontSize: 13, color: colors.ink[500] }}>Moyenne générale</Text>
            <GradeChip value={child.average} />
          </View>
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        {child.subjects.map((sub, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.white,
              borderRadius: radius.lg,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: colors.paper[100],
            }}
          >
            <Text style={{ fontSize: 14, color: colors.ink[700] }}>
              {sub.subjectEmoji ? `${sub.subjectEmoji} ` : ''}
              {sub.subjectName}
            </Text>
            {sub.grade !== null ? (
              <GradeChip value={sub.grade} outOf={sub.outOf} />
            ) : (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.paper[100] }}>
                <Text style={{ fontSize: 12, color: colors.ink[300] }}>En cours</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Relevé de notes (vue parent). Reconstruit depuis /evaluations/my-grades —
 * fiable et autorisé pour le parent. Le bulletin PDF officiel reste généré côté
 * direction (web).
 */
export default function BulletinScreen() {
  const { name } = useLocalSearchParams<{ id: string; name?: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const isParent = role === 'PARENT';
  const { data, isLoading, isError, refetch } = useMyGrades();

  if (!isParent) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.paper[50], padding: 24, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink[700], textAlign: 'center' }}>
          Bulletin PDF
        </Text>
        <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
          Le bulletin officiel se génère depuis l&apos;espace direction (web). Les notes par évaluation
          sont dans l&apos;onglet Pédagogie.
        </Text>
      </View>
    );
  }

  const children = data ?? [];
  const child = name ? children.find((c) => c.childName === name) : children[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
    >
      <ScreenHeader title="Relevé de notes" subtitle="Résultats de votre enfant" />
      <View style={{ height: 16 }} />

      {isLoading ? (
        <View style={{ gap: 8 }} accessibilityRole="progressbar">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} radius={radius.lg} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState
          message="Impossible de charger le relevé."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : !child ? (
        <EmptyState
          icon="school-outline"
          title="Aucune note"
          description="Aucune note disponible pour le moment."
        />
      ) : (
        <Releve child={child} />
      )}

      <BulletinDownloads />
    </ScrollView>
  );
}
