import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import { useMyClasses as useMyClassesAPI, type ClassSummary } from '@/lib/api/classes';
import { useMyGrades, type ChildGrades } from '@/lib/api/evaluations';

// ─── Level → left-border color map ───────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  CP: '#3b82f6',
  CE1: '#22c55e',
  CE2: '#10b981',
  CM1: '#f59e0b',
  CM2: '#f97316',
  PS: '#a78bfa',
  MS: '#8b5cf6',
  GS: '#6d28d9',
  TPS: '#c084fc',
};

function levelColor(level: string): string {
  const upper = level.toUpperCase();
  for (const [key, val] of Object.entries(LEVEL_COLORS)) {
    if (upper.includes(key)) return val;
  }
  return colors.navy[700] ?? '#1e3a5f';
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.ink[300],
        marginBottom: 10,
        marginTop: 4,
      }}
    >
      {children}
    </Text>
  );
}

function SkeletonCard() {
  return (
    <View
      style={{
        height: 90,
        backgroundColor: colors.paper[100],
        borderRadius: radius.lg,
        marginBottom: 10,
      }}
    />
  );
}

function SkeletonList() {
  return (
    <View>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
      <Text style={{ fontSize: 14, color: colors.ink[500], textAlign: 'center' }}>
        Impossible de charger les classes.
      </Text>
      <Pressable
        onPress={onRetry}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: colors.ink[900],
          borderRadius: radius.md,
        }}
        accessibilityRole="button"
        accessibilityLabel="Réessayer le chargement"
      >
        <Text style={{ color: colors.white, fontWeight: '600', fontSize: 13 }}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <Text style={{ fontSize: 14, color: colors.ink[300] }}>{message}</Text>
    </View>
  );
}

// ─── Teacher / Admin class card ──────────────────────────────────────────────

function ClassCard({ cls }: { cls: ClassSummary }) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
  const accessToken = useAuthStore((s) => s.accessToken);
  const borderColor = levelColor(cls.level);

  function handleOpenGrades() {
    const url = `${apiUrl}/classes/${cls.id}/grades?token=${accessToken ?? ''}`;
    void Linking.openURL(url);
  }

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink[900] }}>
            {cls.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: borderColor + '18',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: borderColor }}>
                {cls.level}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.ink[500] }}>
              {cls.studentCount ?? 0} {(cls.studentCount ?? 0) === 1 ? 'élève' : 'élèves'}
            </Text>
          </View>
          {cls.subject ? (
            <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 3 }}>{cls.subject}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={handleOpenGrades}
          style={{ paddingLeft: 12 }}
          accessibilityRole="link"
          accessibilityLabel={`Voir les notes de ${cls.name}`}
        >
          <Text style={{ fontSize: 12, color: colors.ambre[600], fontWeight: '600' }}>
            Voir les notes →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Teacher / Admin view ────────────────────────────────────────────────────

function TeacherAdminView({ classes, isAdmin }: { classes: ClassSummary[]; isAdmin: boolean }) {
  if (classes.length === 0) {
    return (
      <EmptyState
        message={isAdmin ? 'Aucune classe dans cet établissement.' : 'Aucune classe assignée.'}
      />
    );
  }
  return (
    <View>
      <SectionTitle>{isAdmin ? 'Toutes les classes' : 'Vos classes assignées'}</SectionTitle>
      {classes.map((cls) => (
        <ClassCard key={cls.id} cls={cls} />
      ))}
    </View>
  );
}

function TeacherAdminContainer({ isAdmin }: { isAdmin: boolean }) {
  // Admin sees all classes; teacher sees only their assigned ones (mine=true).
  const { data, isLoading, isError, refetch } = useMyClassesAPI(!isAdmin);
  if (isLoading) return <SkeletonList />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  return <TeacherAdminView classes={data ?? []} isAdmin={isAdmin} />;
}

// ─── Parent view ─────────────────────────────────────────────────────────────

function ParentChildCard({ child }: { child: ChildGrades }) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        padding: 14,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
        {child.childName}
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 2 }}>{child.className}</Text>
      {child.average !== null ? (
        <Text
          style={{ fontSize: 12, color: colors.ambre[600], marginTop: 4, fontWeight: '600' }}
        >
          Moyenne : {child.average}/20
        </Text>
      ) : null}
    </View>
  );
}

function ParentContainer() {
  const { data, isLoading, isError, refetch } = useMyGrades();
  if (isLoading) return <SkeletonList />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  const children = data ?? [];
  if (children.length === 0) return <EmptyState message="Aucun enfant inscrit." />;
  return (
    <View>
      <SectionTitle>Classes de vos enfants</SectionTitle>
      {children.map((child, i) => (
        <ParentChildCard key={i} child={child} />
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ClassesScreen() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const isAdmin = role === 'SCHOOL_ADMIN';
  const isTeacher = role === 'TEACHER';
  const isParent = role === 'PARENT';

  const subtitle =
    isTeacher
      ? 'Vos classes assignées'
      : isAdmin
        ? 'Toutes les classes'
        : 'Classes de vos enfants';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
    >
      <Text
        style={{ fontSize: 22, fontWeight: '700', color: colors.ink[900], marginBottom: 4 }}
        accessibilityRole="header"
      >
        Mes classes
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 20 }}>{subtitle}</Text>

      {(isTeacher || isAdmin) && <TeacherAdminContainer isAdmin={isAdmin} />}
      {isParent && <ParentContainer />}
      {!role && <ParentContainer />}
    </ScrollView>
  );
}
