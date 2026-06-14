import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, FormField, colors, radius } from '@klasso/ui-mobile';
import {
  canAccessCashRegister,
  formatAmount,
  sumByKind,
  useCloseSession,
  useCurrentSession,
  type CashMovement,
  type CashSession,
  type CloseSessionResult,
} from '@/lib/api/cash-register';
import { useAuthStore } from '@/lib/auth/store';
import { OpenCaisseForm } from '@/components/caisse/open-caisse-form';
import { AddMovementForm } from '@/components/caisse/add-movement-form';

export default function ManageCaisseScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError, refetch } = useCurrentSession(role);
  const closeM = useCloseSession();

  const [counted, setCounted] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [closed, setClosed] = useState<CloseSessionResult | null>(null);

  const session = data ?? null;

  function cloturer(currentSession: CashSession): void {
    const normalized = counted.replace(',', '.').trim();
    const amount = Number(normalized);
    if (normalized.length === 0 || Number.isNaN(amount) || amount < 0) {
      setFormError('Saisissez un montant compté valide.');
      return;
    }
    setFormError(null);
    setClosed(null);
    closeM.mutate(
      { sessionId: currentSession.id, countedAmount: amount },
      {
        onSuccess: (res) => {
          setClosed(res);
          setCounted('');
        },
        onError: () => {
          setFormError('La clôture a échoué. Réessayez.');
        },
      },
    );
  }

  if (!canAccessCashRegister(role)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
        <EmptyState
          icon="lock-closed-outline"
          title="Accès réservé"
          description="Cette page est réservée à l'administration et au personnel de l'établissement."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {closed !== null ? <ClosedBanner result={closed} /> : null}

        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }}>
            <Text style={{ color: colors.status.danger500, fontSize: 14 }}>
              Erreur de chargement.
            </Text>
            <View style={{ width: 160 }}>
              <Button label="Réessayer" variant="secondary" onPress={() => void refetch()} />
            </View>
          </View>
        ) : session === null ? (
          <OpenCaisseForm />
        ) : closed !== null ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="Caisse clôturée"
            description="La caisse du jour a été clôturée. Le détail figure ci-dessus."
          />
        ) : (
          <OpenSession
            session={session}
            counted={counted}
            onChangeCounted={setCounted}
            formError={formError}
            onClose={() => cloturer(session)}
            closing={closeM.isPending}
          />
        )}
      </ScrollView>
    </View>
  );
}

function ClosedBanner({ result }: { result: CloseSessionResult }) {
  const balanced = Math.abs(result.variance) < 0.0005;
  const positive = result.variance > 0;
  const color = balanced ? colors.status.success500 : colors.ambre[600];
  const ecartLabel = balanced
    ? 'Caisse équilibrée'
    : `Écart ${positive ? 'excédent' : 'manquant'} : ${formatAmount(Math.abs(result.variance))}`;
  return (
    <View
      accessibilityRole="alert"
      style={{
        gap: 6,
        backgroundColor: color + '18',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: color + '33',
        padding: 14,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="checkmark-circle" size={18} color={color} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color }}>{ecartLabel}</Text>
      </View>
      <Text style={{ fontSize: 13, color: colors.ink[700] }}>
        Attendu {formatAmount(result.expectedAmount)} · Compté {formatAmount(result.countedAmount)}
      </Text>
    </View>
  );
}

function OpenSession({
  session,
  counted,
  onChangeCounted,
  formError,
  onClose,
  closing,
}: {
  session: CashSession;
  counted: string;
  onChangeCounted: (v: string) => void;
  formError: string | null;
  onClose: () => void;
  closing: boolean;
}) {
  const income = useMemo(() => sumByKind(session.movements, 'INCOME'), [session.movements]);
  const expense = useMemo(() => sumByKind(session.movements, 'EXPENSE'), [session.movements]);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: colors.status.success500 + '18',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.status.success500 }}>
            Caisse ouverte
          </Text>
        </View>
      </View>

      <TotalRow label="Fonds d'ouverture" value={formatAmount(session.openingFloat)} />
      <TotalRow label="Encaissements" value={formatAmount(income)} accent={colors.status.success500} />
      <TotalRow label="Décaissements" value={formatAmount(expense)} accent={colors.ambre[600]} />
      <TotalRow label="Solde attendu" value={formatAmount(session.liveExpected)} emphasis />

      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: colors.ink[700],
          marginTop: 20,
          marginBottom: 10,
        }}
      >
        Mouvements ({session.movements.length})
      </Text>
      {session.movements.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 8 }}>
          Aucun mouvement enregistré pour le moment.
        </Text>
      ) : (
        session.movements.map((m) => <MovementRow key={m.id} movement={m} />)
      )}

      <AddMovementForm sessionId={session.id} />

      <View
        style={{
          marginTop: 24,
          backgroundColor: colors.white,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 16,
        }}
      >
        <Text
          style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900], marginBottom: 12 }}
        >
          Clôturer la caisse
        </Text>
        <FormField
          label="Montant compté (TND)"
          required
          value={counted}
          onChangeText={onChangeCounted}
          keyboardType="decimal-pad"
          placeholder="0.000"
          error={formError ?? undefined}
          hint="Saisissez le total physiquement compté en caisse."
        />
        <Button
          label="Clôturer la caisse"
          variant="danger"
          loading={closing}
          onPress={onClose}
          accessibilityLabel="Clôturer la caisse du jour"
        />
      </View>
    </View>
  );
}

function TotalRow({
  label,
  value,
  accent,
  emphasis,
}: {
  label: string;
  value: string;
  accent?: string;
  emphasis?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: emphasis ? colors.ambre[500] : colors.paper[100],
        paddingVertical: 13,
        paddingHorizontal: 14,
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          fontSize: emphasis ? 15 : 14,
          fontWeight: emphasis ? '700' : '600',
          color: colors.ink[700],
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: emphasis ? 16 : 15,
          fontWeight: '700',
          color: accent ?? (emphasis ? colors.ink[900] : colors.ink[700]),
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function MovementRow({ movement }: { movement: CashMovement }) {
  const isIncome = movement.kind === 'INCOME';
  const color = isIncome ? colors.status.success500 : colors.ambre[600];
  return (
    <View
      accessibilityLabel={`${isIncome ? 'Encaissement' : 'Décaissement'} : ${movement.label}, ${formatAmount(movement.amount)}`}
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
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: color + '18',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={isIncome ? 'arrow-down-outline' : 'arrow-up-outline'}
          size={18}
          color={color}
        />
      </View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink[900] }}>
        {movement.label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color }}>
        {isIncome ? '+' : '−'}
        {formatAmount(movement.amount)}
      </Text>
    </View>
  );
}
