import React from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import {
  useAdminClassPerf,
  useMyClasses,
  useMyGrades,
  type AdminClassPerf,
  type ChildGrades,
  type ClassEvalStats,
} from '@/lib/api/evaluations';

// ─── Shared helpers ──────────────────────────────────────────────────────────

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

// ─── Skeleton card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View
      style={{
        height: 80,
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

// ─── Error state ─────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
      <Text style={{ fontSize: 14, color: colors.ink[500], textAlign: 'center' }}>
        Impossible de charger les données.
      </Text>
      <Pressable
        onPress={onRetry}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: colors.ink[900],
          borderRadius: radius.md,
        }}
      >
        <Text style={{ color: colors.white, fontWeight: '600', fontSize: 13 }}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <Text style={{ fontSize: 14, color: colors.ink[300] }}>Aucune donnée disponible</Text>
    </View>
  );
}

// ─── Teacher view ────────────────────────────────────────────────────────────

function TeacherView({
  classes,
  isKG,
}: {
  classes: ClassEvalStats[];
  isKG: boolean;
}) {
  if (classes.length === 0) return <EmptyState />;

  return (
    <>
      <SectionTitle>{isKG ? 'Mes groupes' : 'Mes classes'}</SectionTitle>
      <View style={{ gap: 10 }}>
        {classes.map((cls, i) => {
          const pct =
            cls.studentCount > 0
              ? Math.round((cls.doneCount / cls.studentCount) * 100)
              : 0;
          return (
            <View
              key={i}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.paper[100],
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text
                    style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}
                  >
                    {cls.className}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: colors.ink[500], marginTop: 1 }}
                  >
                    {cls.subjectName} · {cls.studentCount} élèves
                  </Text>
                </View>
                {cls.average !== null && <GradeChip value={cls.average} />}
              </View>
              <View style={{ marginTop: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, color: colors.ink[300] }}>Notes saisies</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: pct === 100 ? '#34d399' : '#f2683f',
                    }}
                  >
                    {cls.doneCount}/{cls.studentCount} ({pct}%)
                  </Text>
                </View>
                <View
                  style={{
                    height: 4,
                    backgroundColor: colors.paper[100],
                    borderRadius: 2,
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      width: `${pct}%` as `${number}%`,
                      backgroundColor: pct === 100 ? '#34d399' : '#f2683f',
                    }}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

// ─── Parent view ─────────────────────────────────────────────────────────────

function ParentView({
  children,
}: {
  children: ChildGrades[];
}) {
  if (children.length === 0) return <EmptyState />;

  return (
    <>
      {children.map((child, ci) => (
        <View key={ci} style={{ marginBottom: 20 }}>
          <SectionTitle>
            {child.childName} · {child.className}
          </SectionTitle>
          <View style={{ gap: 8 }}>
            {child.subjects.map((sub, si) => (
              <View
                key={si}
                style={{
                  backgroundColor: colors.white,
                  borderRadius: radius.lg,
                  padding: 12,
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
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

// ─── Admin view ──────────────────────────────────────────────────────────────

function AdminView({ classStats }: { classStats: AdminClassPerf[] }) {
  if (classStats.length === 0) return <EmptyState />;

  return (
    <>
      <SectionTitle>Performance par classe</SectionTitle>
      <View style={{ gap: 8 }}>
        {classStats.map((cls, i) => (
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
            <View>
              <Text
                style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}
              >
                {cls.className}
              </Text>
              <Text
                style={{ fontSize: 11, color: colors.ink[300], marginTop: 1 }}
              >
                {cls.studentCount} élèves
                {cls.topSubject ? ` · Meilleure : ${cls.topSubject}` : ''}
              </Text>
            </View>
            {cls.overall !== null ? (
              <GradeChip value={cls.overall} />
            ) : (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: colors.paper[100],
                }}
              >
                <Text style={{ fontSize: 12, color: colors.ink[300] }}>—</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </>
  );
}

// ─── Role-specific data containers ───────────────────────────────────────────

function TeacherContainer({ isKG }: { isKG: boolean }) {
  const { data, isLoading, isError, refetch } = useMyClasses();

  if (isLoading) return <SkeletonList />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  return <TeacherView classes={data ?? []} isKG={isKG} />;
}

function ParentContainer() {
  const { data, isLoading, isError, refetch } = useMyGrades();

  if (isLoading) return <SkeletonList />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  return <ParentView children={data ?? []} />;
}

function AdminContainer() {
  const { data, isLoading, isError, refetch } = useAdminClassPerf();

  if (isLoading) return <SkeletonList />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  return <AdminView classStats={data ?? []} />;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PedagogyScreen() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const isKG = tenant?.type === 'KINDERGARTEN';

  const title = isKG ? 'Vie scolaire' : 'Pédagogie';
  const subtitle =
    user?.role === 'TEACHER'
      ? 'Mes classes et notes'
      : user?.role === 'PARENT'
        ? 'Notes de mes enfants'
        : user?.role === 'SCHOOL_ADMIN'
          ? "Vue d'ensemble"
          : 'Résultats scolaires';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: colors.ink[900],
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 20 }}>
        {subtitle}
      </Text>

      {(user?.role === 'TEACHER' || user?.role === 'SCHOOL_ADMIN') && (
        <Pressable
          onPress={() => router.push('/(app)/pedagogy/evaluations')}
          accessibilityRole="button"
          accessibilityLabel="Gérer les évaluations"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.ink[900],
            borderRadius: radius.lg,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>
            Gérer les évaluations
          </Text>
          <Text style={{ color: colors.ambre[500], fontWeight: '700', fontSize: 16 }}>→</Text>
        </Pressable>
      )}

      {(user?.role === 'TEACHER' || user?.role === 'SCHOOL_ADMIN') && (
        <Pressable
          onPress={() => router.push('/(app)/pedagogy/homework')}
          accessibilityRole="button"
          accessibilityLabel="Gérer les devoirs"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.ink[900],
            borderRadius: radius.lg,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>
            Devoirs (TAF)
          </Text>
          <Text style={{ color: colors.ambre[500], fontWeight: '700', fontSize: 16 }}>→</Text>
        </Pressable>
      )}

      {user?.role === 'TEACHER' && <TeacherContainer isKG={isKG} />}
      {user?.role === 'PARENT' && <ParentContainer />}
      {user?.role === 'SCHOOL_ADMIN' && <AdminContainer />}
      {!user?.role && <ParentContainer />}
    </ScrollView>
  );
}
