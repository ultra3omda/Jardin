import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, EmptyState, Skeleton, colors, radius } from '@klasso/ui-mobile';
import { useMyChildren, useMyInvoices } from '@/lib/api/parent';
import { useMyGrades } from '@/lib/api/evaluations';
import { useJournal } from '@/lib/api/school-life';
import { formatAmount } from '@/lib/api/billing';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const CHILD_COLORS = ['#f2683f', '#3b82f6', '#22c55e', '#a78bfa', '#ec4899'];

/** Tableau de bord parent : enfants, notes, paiements, journal — données réelles. */
export function ParentDashboard() {
  const children = useMyChildren();
  const grades = useMyGrades();
  const invoices = useMyInvoices();
  const journal = useJournal();

  const kids = children.data ?? [];
  const pending = (invoices.data?.items ?? [])
    .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((acc, i) => acc + i.amount, 0);
  const recentJournal = (journal.data?.items ?? []).slice(0, 3);

  if (children.isLoading) {
    return (
      <View style={{ gap: 10, paddingTop: 8 }}>
        <Skeleton height={64} radius={14} />
        <Skeleton height={64} radius={14} />
        <Skeleton height={88} radius={14} />
      </View>
    );
  }

  return (
    <View>
      {/* À traiter — priorité paiements (Priority-first parity with web) */}
      {pending > 0 ? (
        <>
          <SectionTitle>À traiter</SectionTitle>
          <Card accent="#d97706">
            <Text style={{ fontSize: 12, color: colors.ink[500] }}>Solde à régler</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#d97706', marginTop: 2 }}>
              {formatAmount(pending)}
            </Text>
            <Pressable onPress={() => router.push('/(app)/parent/payments')} accessibilityRole="button">
              <Text style={{ fontSize: 13, color: colors.ambre[600], fontWeight: '600', marginTop: 6 }}>
                Voir les factures →
              </Text>
            </Pressable>
          </Card>
        </>
      ) : null}

      {/* Children */}
      <SectionTitle>Mes enfants</SectionTitle>
      {kids.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Aucun enfant"
          description="Aucun enfant n'est rattaché à votre compte."
        />
      ) : (
        kids.map((c, i) => {
          const g = (grades.data ?? []).find(
            (x) => x.childName === `${c.firstName} ${c.lastName}`,
          );
          const color = CHILD_COLORS[i % CHILD_COLORS.length];
          return (
            <View
              key={c.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: color + '1a',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color }}>
                  {c.firstName.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
                  {c.firstName} {c.lastName}
                </Text>
                <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>
                  {c.className ?? 'Classe non assignée'}
                  {g?.average != null ? ` · Moyenne ${g.average}/20` : ''}
                </Text>
              </View>
            </View>
          );
        })
      )}

      {/* Quick actions */}
      <SectionTitle>Accès rapide</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Action icon="reader-outline" label="Devoirs" color="#8b5cf6" onPress={() => router.push('/(app)/parent/homework')} />
        <Action icon="calendar-outline" label="Emploi du temps" color="#3b82f6" onPress={() => router.push('/(app)/parent/schedule')} />
        <Action icon="eye-outline" label="Observations" color="#671bf0" onPress={() => router.push('/(app)/parent/observations' as never)} />
        <Action icon="restaurant-outline" label="Cantine" color="#02a896" onPress={() => router.push('/(app)/parent/canteen' as never)} />
        <Action icon="color-palette-outline" label="Activités" color="#f08d00" onPress={() => router.push('/(app)/parent/activities' as never)} />
        <Action icon="calendar-outline" label="Rendez-vous" color="#02a896" onPress={() => router.push('/(app)/parent/appointments' as never)} />
        <Action icon="calendar-number-outline" label="Calendrier" color="#671bf0" onPress={() => router.push('/(app)/parent/calendar' as never)} />
        <Action icon="card-outline" label="Paiements" color="#14b8a6" onPress={() => router.push('/(app)/parent/payments')} />
        <Action icon="book-outline" label="Journal" color="#f59e0b" onPress={() => router.push('/(app)/life')} />
        <Action icon="chatbubbles-outline" label="Messages" color="#ec4899" onPress={() => router.push('/(app)/messages')} />
      </View>

      {/* Recent journal */}
      {recentJournal.length > 0 ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink[900], marginBottom: 10 }}>
            Cahier de liaison
          </Text>
          {recentJournal.map((e, i) => (
            <View
              key={e.id}
              style={{
                paddingVertical: 8,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: 'rgba(15,20,25,0.05)',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink[900] }}>
                {e.studentName}
                <Text style={{ fontWeight: '400', color: colors.ink[300] }}>  {e.date.slice(0, 10)}</Text>
              </Text>
              {e.generalNote ? (
                <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }} numberOfLines={2}>
                  {e.generalNote}
                </Text>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function Action({
  icon,
  label,
  color,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: '47.5%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        padding: 14,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: color + '18',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink[900] }}>{label}</Text>
    </Pressable>
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
        marginTop: 16,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}
