import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import { fetchApi } from '@/lib/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulletinSubject {
  subjectName: string;
  subjectEmoji?: string;
  grade: number | null;
  outOf: number;
}

interface BulletinData {
  studentName: string;
  periodName: string;
  average: number | null;
  subjects: BulletinSubject[];
}

// ─── Query key ────────────────────────────────────────────────────────────────

const BULLETIN_KEYS = {
  latest: (id: string) => ['bulletin', id, 'latest'] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function SkeletonRow() {
  return (
    <View
      style={{
        height: 52,
        backgroundColor: colors.paper[100],
        borderRadius: radius.md,
        marginBottom: 8,
      }}
    />
  );
}

function SkeletonList() {
  return (
    <View>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );
}

// ─── PDF open button ──────────────────────────────────────────────────────────

function PdfOpenButton({ id, accessToken }: { id: string; accessToken: string | null }) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

  function handleOpen() {
    const url = `${apiUrl}/api/bulletins/${id}/pdf?token=${accessToken ?? ''}`;
    void Linking.openURL(url);
  }

  return (
    <Pressable
      onPress={handleOpen}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.ink[900],
        borderRadius: radius.lg,
        paddingVertical: 14,
        marginBottom: 20,
      }}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir le bulletin PDF"
    >
      <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>
        Ouvrir le bulletin PDF
      </Text>
    </Pressable>
  );
}

// ─── Metadata card ────────────────────────────────────────────────────────────

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
      <Text
        style={{
          fontSize: 11,
          color: colors.ink[300],
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900], marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Subject row ──────────────────────────────────────────────────────────────

function SubjectRow({ subject }: { subject: BulletinSubject }) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.paper[100],
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 14, color: colors.ink[700], flex: 1 }}>
        {subject.subjectEmoji ? `${subject.subjectEmoji} ` : ''}
        {subject.subjectName}
      </Text>
      {subject.grade !== null ? (
        <GradeChip value={subject.grade} outOf={subject.outOf} />
      ) : (
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: colors.paper[100],
          }}
        >
          <Text style={{ fontSize: 12, color: colors.ink[300] }}>En cours</Text>
        </View>
      )}
    </View>
  );
}

// ─── Bulletin content ─────────────────────────────────────────────────────────

function BulletinContent({
  data,
  id,
  accessToken,
}: {
  data: BulletinData;
  id: string;
  accessToken: string | null;
}) {
  return (
    <>
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.paper[100],
          flexDirection: 'row',
          marginBottom: 20,
          overflow: 'hidden',
        }}
      >
        <MetaCard label="Élève" value={data.studentName} />
        <View style={{ width: 1, backgroundColor: colors.paper[100] }} />
        <MetaCard label="Période" value={data.periodName} />
        {data.average !== null && (
          <>
            <View style={{ width: 1, backgroundColor: colors.paper[100] }} />
            <MetaCard label="Moyenne" value={`${data.average}/20`} />
          </>
        )}
      </View>

      <PdfOpenButton id={id} accessToken={accessToken} />

      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: colors.ink[300],
          marginBottom: 10,
        }}
      >
        Résultats par matière
      </Text>

      {data.subjects.map((sub, i) => (
        <SubjectRow key={i} subject={sub} />
      ))}
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BulletinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: BULLETIN_KEYS.latest(id ?? ''),
    queryFn: () => fetchApi<BulletinData>(`/api/bulletins/${id}/latest`),
    enabled: !!id,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <Text
        style={{ fontSize: 22, fontWeight: '700', color: colors.ink[900], marginBottom: 4 }}
        accessibilityRole="header"
      >
        Bulletin scolaire
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 20 }}>
        Résultats et relevé de notes
      </Text>

      {isLoading && <SkeletonList />}

      {isError && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 14, color: colors.ink[500], textAlign: 'center' }}>
            Impossible de charger le bulletin.
          </Text>
          <PdfOpenButton id={id ?? ''} accessToken={accessToken} />
          <Pressable
            onPress={() => void refetch()}
            style={{
              alignSelf: 'center',
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: colors.paper[100],
              borderRadius: radius.md,
            }}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 13, color: colors.ink[700], fontWeight: '600' }}>
              Réessayer
            </Text>
          </Pressable>
        </View>
      )}

      {data && !isLoading && (
        <BulletinContent data={data} id={id ?? ''} accessToken={accessToken} />
      )}
    </ScrollView>
  );
}
