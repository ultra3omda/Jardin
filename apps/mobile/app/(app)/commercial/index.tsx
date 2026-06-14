import { Link, router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Fab, colors, fonts, radius } from '@klasso/ui-mobile';
import {
  useOrganizations,
  type InviteStatus,
  type OrganizationSummary,
  type TenantStatus,
} from '@/lib/api/commercial';

const STATUS_LABEL: Record<TenantStatus, { text: string; bg: string; fg: string }> = {
  PENDING_ONBOARDING: { text: 'Onboarding en attente', bg: 'rgba(217,119,6,0.10)', fg: '#b45309' },
  ACTIVE: { text: 'Active', bg: 'rgba(5,150,105,0.10)', fg: '#059669' },
  SUSPENDED: { text: 'Suspendue', bg: 'rgba(239,68,68,0.10)', fg: '#ef4444' },
};

const INVITE_LABEL: Record<InviteStatus, string> = {
  pending: 'Invitation envoyée',
  consumed: 'Compte admin créé',
  expired: 'Invitation expirée',
};

function StatusBadge({ status }: { status: TenantStatus }) {
  const s = STATUS_LABEL[status];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, fontFamily: fonts.bodySemibold, color: s.fg }}>{s.text}</Text>
    </View>
  );
}

function OrgRow({ org }: { org: OrganizationSummary }) {
  const invite = org.inviteStatus ? INVITE_LABEL[org.inviteStatus] : '—';
  return (
    <Link href={{ pathname: '/(app)/commercial/[id]', params: { id: org.id } }} asChild>
      <View
        accessibilityRole="link"
        accessibilityLabel={`${org.name}, ${STATUS_LABEL[org.status].text}`}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 14,
          marginBottom: 10,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: fonts.bodySemibold, color: colors.ink[900] }} numberOfLines={1}>
            {org.name}
          </Text>
          <Text style={{ fontSize: 12, color: colors.ink[300], fontFamily: fonts.body }}>
            {org.contractsCount} contrat{org.contractsCount > 1 ? 's' : ''}
          </Text>
        </View>
        <StatusBadge status={org.status} />
        <Text style={{ fontSize: 12, color: colors.ink[500], fontFamily: fonts.body }} numberOfLines={1}>
          {org.slug} · {invite}
        </Text>
      </View>
    </Link>
  );
}

export default function CommercialOrgsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch, isRefetching } = useOrganizations();
  const orgs = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <FlatList
        data={orgs}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.ambre[500]} />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 24, fontFamily: fonts.displayBold, color: colors.ink[900] }}>
              Organisations
            </Text>
            <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 4, fontFamily: fonts.body }}>
              Les établissements que vous avez signés et leur onboarding.
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 32 }} />
          ) : error ? (
            <EmptyState icon="alert-circle-outline" title="Erreur" description={(error as Error).message} />
          ) : (
            <EmptyState
              icon="business-outline"
              title="Aucune organisation"
              description="Aucun établissement signé pour l'instant."
            />
          )
        }
        renderItem={({ item }) => <OrgRow org={item} />}
      />
      <Fab label="Nouvelle organisation" extended onPress={() => router.push('/(app)/commercial/new')} />
    </View>
  );
}
