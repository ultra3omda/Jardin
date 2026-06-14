import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button, Card, EmptyState, colors, fonts } from '@klasso/ui-mobile';
import {
  canDownloadContract,
  openContractPdf,
  useOrganization,
  type InviteStatus,
  type TenantStatus,
} from '@/lib/api/commercial';

const STATUS_TEXT: Record<TenantStatus, string> = {
  PENDING_ONBOARDING: 'Onboarding en attente',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspendue',
};

const INVITE_TEXT: Record<InviteStatus, string> = {
  pending: 'Invitation envoyée',
  consumed: 'Compte admin créé',
  expired: 'Invitation expirée',
};

const TYPE_TEXT: Record<string, string> = {
  PRIMARY_SCHOOL: 'École primaire',
  KINDERGARTEN: "Jardin d'enfants",
  MIXED: 'Mixte',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 12 }}>
      <Text style={{ fontSize: 13, color: colors.ink[500], fontFamily: fonts.body }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: colors.ink[900], fontFamily: fonts.bodySemibold, textAlign: 'right' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function OrganizationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: org, isLoading, error } = useOrganization(id ?? '');
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper[50] }}>
        <ActivityIndicator color={colors.ambre[500]} />
      </View>
    );
  }

  if (error || !org) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
        <EmptyState
          icon="alert-circle-outline"
          title="Introuvable"
          description={error ? (error as Error).message : 'Organisation introuvable.'}
        />
      </View>
    );
  }

  async function download() {
    setDlError(null);
    setDownloading(true);
    try {
      await openContractPdf(org!.id);
    } catch (e) {
      setDlError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <Text style={{ fontSize: 22, fontFamily: fonts.displayBold, color: colors.ink[900], marginBottom: 16 }}>
        {org.name}
      </Text>

      <Card>
        <Row label="Statut" value={STATUS_TEXT[org.status]} />
        <Row label="Slug" value={org.slug} />
        <Row label="Type" value={TYPE_TEXT[org.type] ?? org.type} />
        <Row label="Invitation admin" value={org.inviteStatus ? INVITE_TEXT[org.inviteStatus] : '—'} />
        <Row label="Contrats" value={String(org.contractsCount)} />
      </Card>

      {org.contractsCount > 0 ? (
        <View style={{ marginTop: 16 }}>
          {canDownloadContract ? (
            <>
              <Button label="Ouvrir le contrat signé" variant="secondary" onPress={download} loading={downloading} />
              {dlError ? (
                <Text style={{ fontSize: 12, color: colors.status.danger500, marginTop: 6 }}>{dlError}</Text>
              ) : null}
            </>
          ) : (
            <Text style={{ fontSize: 12, color: colors.ink[300], fontFamily: fonts.body }}>
              Le téléchargement du contrat est disponible depuis l&apos;espace web.
            </Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
