import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, colors, radius } from '@klasso/ui-mobile';
import {
  formatAmount,
  formatDueDate,
  useRemindUnpaid,
  useUnpaid,
  type UnpaidInstallment,
} from '@/lib/api/fees';
import { useAuthStore } from '@/lib/auth/store';

export default function ManageUnpaidScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError, refetch } = useUnpaid(role);
  const remindM = useRemindUnpaid();

  const [selected, setSelected] = useState<Record<string, true>>({});
  const [sentBanner, setSentBanner] = useState<number | null>(null);

  const installments = data ?? [];
  const selectedIds = useMemo(() => Object.keys(selected), [selected]);
  const selectedCount = selectedIds.length;

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }

  function relancer(): void {
    if (selectedCount === 0) return;
    setSentBanner(null);
    remindM.mutate(selectedIds, {
      onSuccess: (res) => {
        setSelected({});
        setSentBanner(res.sent);
      },
    });
  }

  if (role !== 'SCHOOL_ADMIN') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
        <EmptyState
          icon="lock-closed-outline"
          title="Accès réservé"
          description="Cette page est réservée à l'administration de l'établissement."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {sentBanner !== null ? (
          <View
            accessibilityRole="alert"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#05966918',
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: '#05966933',
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#059669' }}>
              {sentBanner} rappel{sentBanner > 1 ? 's' : ''} envoyé{sentBanner > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }}>
            <Text style={{ color: colors.status.danger500, fontSize: 14 }}>Erreur de chargement.</Text>
            <View style={{ width: 160 }}>
              <Button label="Réessayer" variant="secondary" onPress={() => void refetch()} />
            </View>
          </View>
        ) : installments.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="Aucun impayé"
            description="Toutes les échéances sont réglées."
          />
        ) : (
          installments.map((item) => (
            <UnpaidRow
              key={item.installmentId}
              item={item}
              selected={!!selected[item.installmentId]}
              onToggle={() => toggle(item.installmentId)}
            />
          ))
        )}
      </ScrollView>

      {selectedCount > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
          }}
        >
          <Button
            label={`Relancer la sélection (${selectedCount})`}
            onPress={relancer}
            loading={remindM.isPending}
          />
        </View>
      ) : null}
    </View>
  );
}

function UnpaidRow({
  item,
  selected,
  onToggle,
}: {
  item: UnpaidInstallment;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${item.studentName}, ${item.feeName} ${item.label}, ${formatAmount(item.amount)}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: selected ? colors.ambre[500] : colors.paper[100],
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: selected ? colors.ambre[500] : colors.ink[300],
          backgroundColor: selected ? colors.ambre[500] : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
            {item.studentName}
          </Text>
          {item.overdue ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: colors.status.danger500 + '18',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.status.danger500 }}>
                En retard
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 4 }}>
          {item.feeName} · {item.label}
        </Text>
        <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 2 }}>
          {formatAmount(item.amount)} · échéance {formatDueDate(item.dueDate)}
        </Text>
      </View>
    </Pressable>
  );
}
