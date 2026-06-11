import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, EmptyState, KpiCard, ScreenHeader, type KpiVariant, colors } from '@klasso/ui-mobile';
import { useDashboardOverview, type DashboardOverview } from '@/lib/api/dashboard';
import { useAuthStore } from '@/lib/auth/store';
import { ParentDashboard } from '@/components/dashboard/parent-dashboard';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Kpi {
  label: string;
  value: string;
  variant: KpiVariant;
  icon: IoniconName;
  sub?: string;
}

function nf(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(n);
}

/** Role-aware KPI selection, fed with REAL overview data. */
function buildKpis(role: string | undefined, isKG: boolean, d?: DashboardOverview): Kpi[] {
  if (!d) return [];
  const present = d.todayAttendance.present;
  if (isKG) {
    return [
      { label: 'Enfants', value: nf(d.totalStudents), variant: 'pink', icon: 'happy-outline' },
      { label: 'Présents', value: nf(present), variant: 'green', icon: 'checkmark-done-outline' },
      { label: 'Journal', value: nf(d.journalToday), variant: 'amber', icon: 'book-outline' },
      { label: 'Activités', value: nf(d.activitiesToday), variant: 'purple', icon: 'color-palette-outline' },
    ];
  }
  if (role === 'PARENT') {
    return [
      { label: 'Mes enfants', value: nf(d.totalStudents), variant: 'pink', icon: 'people-outline' },
      { label: 'À régler', value: nf(d.pendingPayments), variant: 'orange', icon: 'card-outline' },
      { label: 'Présence', value: d.attendanceRate === null ? '—' : `${d.attendanceRate}%`, variant: 'green', icon: 'checkmark-circle-outline' },
      { label: 'Moyenne', value: d.averageGrade === null ? '—' : nf(d.averageGrade), variant: 'amber', icon: 'school-outline' },
    ];
  }
  // TEACHER — scoped to their classes, no finance.
  if (role === 'TEACHER') {
    return [
      { label: 'Mes élèves', value: nf(d.totalStudents), variant: 'blue', icon: 'people-outline' },
      { label: 'Présence', value: d.attendanceRate === null ? '—' : `${d.attendanceRate}%`, variant: 'green', icon: 'checkmark-circle-outline' },
      { label: 'Moyenne', value: d.averageGrade === null ? '—' : nf(d.averageGrade), variant: 'amber', icon: 'school-outline' },
      { label: 'Mes classes', value: nf(d.classesCount), variant: 'purple', icon: 'easel-outline' },
    ];
  }
  // SCHOOL_ADMIN / STAFF
  return [
    { label: 'Élèves', value: nf(d.totalStudents), variant: 'blue', icon: 'people-outline' },
    { label: 'Présence', value: d.attendanceRate === null ? '—' : `${d.attendanceRate}%`, variant: 'green', icon: 'checkmark-circle-outline' },
    { label: 'Paiements', value: nf(d.pendingPayments), variant: 'orange', icon: 'card-outline', sub: 'en attente' },
    { label: 'Moyenne', value: d.averageGrade === null ? '—' : nf(d.averageGrade), variant: 'amber', icon: 'school-outline', sub: `${nf(d.classesCount)} classes` },
  ];
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const { data, isLoading } = useDashboardOverview(user?.role);
  const canSeeOverview = user?.role === 'SCHOOL_ADMIN' || user?.role === 'TEACHER' || user?.role === 'STAFF';

  const isKG = tenant?.type === 'KINDERGARTEN';
  const heading = user?.firstName ? `Bonjour, ${user.firstName}` : 'Tableau de bord';
  const subtitle = tenant?.name ?? 'Bienvenue dans Klasso';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'K';
  const kpis = buildKpis(user?.role, isKG, data);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 32 }}
    >
      <ScreenHeader title={heading} subtitle={subtitle} right={<Avatar initials={initials} size={44} />} />

      {user?.role === 'PARENT' ? (
        <ParentDashboard />
      ) : !canSeeOverview ? (
        <EmptyState
          icon="sparkles-outline"
          title="Bienvenue sur Klasso"
          description="Retrouvez vos messages, notifications et le suivi de votre enfant depuis les onglets ci-dessous."
        />
      ) : isLoading ? (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator color={colors.ambre[500]} />
        </View>
      ) : (
        <>
          {/* KPI grid — 2 columns */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {kpis.map((kpi, i) => (
              <View key={i} style={{ width: '47.5%', flexGrow: 1 }}>
                <KpiCard label={kpi.label} value={kpi.value} variant={kpi.variant} icon={kpi.icon} sub={kpi.sub} />
              </View>
            ))}
          </View>

          {/* Admin management entry */}
          {user?.role === 'SCHOOL_ADMIN' ? (
            <Pressable
              onPress={() => router.push('/(app)/manage')}
              accessibilityRole="button"
              accessibilityLabel="Gérer l'établissement"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.ink[900],
                borderRadius: 16,
                padding: 16,
                marginTop: 16,
              }}
            >
              <Ionicons name="settings-outline" size={22} color={colors.ambre[500]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>
                  Gérer l&apos;établissement
                </Text>
                <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 2 }}>
                  Annuaire, classes, matières, cantine, activités
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.ink[300]} />
            </Pressable>
          ) : null}

          {/* Attendance breakdown */}
          {data ? (
            <Card style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink[900], marginBottom: 12 }}>
                Présence du jour
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <AttPill label="Présents" value={data.todayAttendance.present} tint="rgba(5,150,105,0.10)" color="#059669" />
                <AttPill label="Absents" value={data.todayAttendance.absent} tint="rgba(239,68,68,0.10)" color="#ef4444" />
                <AttPill label="Retards" value={data.todayAttendance.late} tint="rgba(217,119,6,0.10)" color="#d97706" />
                <AttPill label="Excusés" value={data.todayAttendance.excused} tint="rgba(71,85,105,0.10)" color="#475569" />
              </View>
            </Card>
          ) : null}

          {/* Latest announcements */}
          {data && data.announcements.length > 0 ? (
            <Card style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink[900], marginBottom: 10 }}>
                Annonces
              </Text>
              {data.announcements.slice(0, 3).map((a, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: 'rgba(15,20,25,0.05)',
                  }}
                >
                  <Ionicons name="megaphone-outline" size={16} color={colors.ambre[500]} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.ink[700] }} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.ink[300] }}>{a.date}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function AttPill({ label, value, tint, color }: { label: string; value: number; tint: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: tint, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.ink[500], marginTop: 2 }}>{label}</Text>
    </View>
  );
}
