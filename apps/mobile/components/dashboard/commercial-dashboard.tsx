import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Button, KpiCard, colors, type KpiVariant } from '@klasso/ui-mobile';
import { summarizePipeline, useOrganizations } from '@/lib/api/commercial';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Kpi {
  label: string;
  value: string;
  variant: KpiVariant;
  icon: IoniconName;
}

/**
 * Console COMMERCIAL (rôle plateforme, sans tenant) : KPIs du pipeline des
 * établissements signés + raccourcis vers la liste et la création. Les données
 * tenant-scoped (élèves, présences…) ne le concernent pas.
 */
export function CommercialDashboard() {
  const { data, isLoading, isError } = useOrganizations();
  const orgs = data ?? [];
  const s = summarizePipeline(orgs);

  const kpis: Kpi[] = [
    { label: 'Organisations', value: String(s.total), variant: 'blue', icon: 'business-outline' },
    { label: 'Onboarding', value: String(s.pending), variant: 'amber', icon: 'hourglass-outline' },
    { label: 'Actives', value: String(s.active), variant: 'green', icon: 'checkmark-circle-outline' },
    { label: 'Contrats', value: String(s.contracts), variant: 'purple', icon: 'document-text-outline' },
  ];

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 48, alignItems: 'center' }}>
        <ActivityIndicator color={colors.ambre[500]} />
      </View>
    );
  }

  if (isError) {
    return (
      <Text style={{ color: colors.status.danger500 }}>Impossible de charger le pipeline.</Text>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {kpis.map((k, i) => (
          <View key={i} style={{ width: '47.5%', flexGrow: 1 }}>
            <KpiCard label={k.label} value={k.value} variant={k.variant} icon={k.icon} />
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/(app)/commercial')}
        accessibilityRole="button"
        accessibilityLabel="Voir les organisations"
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
        <Ionicons name="business-outline" size={22} color={colors.ambre[500]} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>
            Mes organisations
          </Text>
          <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 2 }}>
            Suivi des établissements signés et de leur onboarding
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.ink[300]} />
      </Pressable>

      <View style={{ marginTop: 16 }}>
        <Button
          label="Nouvelle organisation signée"
          onPress={() => router.push('/(app)/commercial/new')}
        />
      </View>
    </View>
  );
}
