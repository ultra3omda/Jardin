import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { EmptyState, colors, radius } from '@klasso/ui-mobile';
import { formatAmount, statusLabel, type InvoiceStatus } from '@/lib/api/billing';
import { useMyInvoices } from '@/lib/api/parent';

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  PENDING: '#d97706',
  PARTIAL: '#0ea5e9',
  PAID: '#059669',
  OVERDUE: '#ef4444',
  CANCELLED: '#94a3b8',
};

/** Vue parent en lecture seule des factures de ses enfants. */
export default function ParentPaymentsScreen() {
  const { data, isLoading, isError } = useMyInvoices();
  const items = data?.items ?? [];
  const pending = items
    .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((acc, i) => acc + i.amount, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : isError ? (
        <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
      ) : items.length === 0 ? (
        <EmptyState icon="card-outline" title="Aucune facture" description="Rien à régler pour le moment." />
      ) : (
        <>
          {pending > 0 ? (
            <View
              style={{
                backgroundColor: '#fff7ed',
                borderWidth: 1,
                borderColor: '#fed7aa',
                borderRadius: radius.lg,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.ink[500] }}>Solde à régler</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#d97706', marginTop: 2 }}>
                {formatAmount(pending)}
              </Text>
            </View>
          ) : null}

          {items.map((inv) => (
            <View
              key={inv.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
                  {inv.title}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: STATUS_COLOR[inv.status] + '18',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: STATUS_COLOR[inv.status] }}>
                    {statusLabel(inv.status)}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, color: colors.ink[700], marginTop: 6 }}>
                {formatAmount(inv.amount, inv.currency)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 2 }}>
                Échéance {inv.dueDate.slice(0, 10)}
              </Text>
            </View>
          ))}

          <Text style={{ fontSize: 11, color: colors.ink[300], textAlign: 'center', marginTop: 8 }}>
            Le paiement en ligne arrive prochainement. Rapprochez-vous de l&apos;établissement.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
