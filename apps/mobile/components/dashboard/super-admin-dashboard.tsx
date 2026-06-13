import type { ComponentProps } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { Card, KpiCard, colors, type KpiVariant } from '@klasso/ui-mobile';
import {
  ADMIN_AUDIT_KEY,
  ADMIN_OVERVIEW_KEY,
  getAuditLogs,
  getPlatformOverview,
} from '@/lib/api/admin';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Kpi {
  label: string;
  value: string;
  variant: KpiVariant;
  icon: IoniconName;
  sub?: string;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** SUPER_ADMIN platform console: analytics KPIs (M14) + recent audit log (M15). */
export function SuperAdminDashboard() {
  const overviewQuery = useQuery({ queryKey: ADMIN_OVERVIEW_KEY, queryFn: getPlatformOverview });
  const auditQuery = useQuery({ queryKey: ADMIN_AUDIT_KEY, queryFn: () => getAuditLogs(1, 20) });

  const o = overviewQuery.data;
  const kpis: Kpi[] = o
    ? [
        { label: 'Établissements', value: String(o.tenants), variant: 'blue', icon: 'business-outline' },
        { label: 'Utilisateurs', value: String(o.users), variant: 'purple', icon: 'people-outline' },
        { label: 'Élèves', value: String(o.students), variant: 'pink', icon: 'school-outline' },
        { label: 'Abonnements', value: String(o.activeSubscriptions), variant: 'green', icon: 'card-outline' },
        { label: 'MRR', value: `${o.mrr} ${o.currency}`, variant: 'amber', icon: 'trending-up-outline' },
        { label: 'ARR', value: `${o.arr} ${o.currency}`, variant: 'orange', icon: 'cash-outline' },
      ]
    : [];

  const auditItems = auditQuery.data?.items ?? [];

  return (
    <View>
      {overviewQuery.isLoading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator color={colors.ambre[500]} />
        </View>
      ) : overviewQuery.isError ? (
        <Text style={{ color: colors.status.danger500 }}>Impossible de charger les analytics.</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {kpis.map((k, i) => (
            <View key={i} style={{ width: '47.5%', flexGrow: 1 }}>
              <KpiCard label={k.label} value={k.value} variant={k.variant} icon={k.icon} sub={k.sub} />
            </View>
          ))}
        </View>
      )}

      {o && o.pendingDemoRequests > 0 ? (
        <Card style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="mail-unread-outline" size={18} color={colors.ambre[500]} />
            <Text style={{ fontSize: 13, color: colors.ink[700] }}>
              {o.pendingDemoRequests} demande{o.pendingDemoRequests > 1 ? 's' : ''} de démo en attente
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Journal d'audit */}
      <Card style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink[900], marginBottom: 10 }}>
          Journal d&apos;audit
        </Text>
        {auditQuery.isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} />
        ) : auditItems.length === 0 ? (
          <Text style={{ fontSize: 13, color: colors.ink[500] }}>Aucun événement récent.</Text>
        ) : (
          auditItems.slice(0, 15).map((a, i) => (
            <View
              key={a.id}
              style={{
                paddingVertical: 8,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: 'rgba(15,20,25,0.05)',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink[900] }}>
                {a.action} · {a.resource}
              </Text>
              <Text style={{ fontSize: 11, color: colors.ink[500], marginTop: 2 }}>
                {a.tenantName ?? a.userEmail ?? '—'} · {fmtDateTime(a.createdAt)}
              </Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}
