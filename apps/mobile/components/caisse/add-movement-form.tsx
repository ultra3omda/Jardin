import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, FormField, colors, radius } from '@klasso/ui-mobile';
import { useAddMovement, type MovementKind } from '@/lib/api/cash-register';

const KINDS: { value: MovementKind; label: string }[] = [
  { value: 'INCOME', label: 'Encaissement' },
  { value: 'EXPENSE', label: 'Décaissement' },
];

/** Formulaire d'ajout d'un mouvement (encaissement / décaissement) à la caisse. */
export function AddMovementForm({ sessionId }: { sessionId: string }) {
  const addM = useAddMovement();
  const [kind, setKind] = useState<MovementKind>('INCOME');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const value = Number(amount.replace(',', '.').trim());
    if (Number.isNaN(value) || value <= 0) {
      setError('Montant invalide.');
      return;
    }
    if (!label.trim()) {
      setError('Libellé requis.');
      return;
    }
    setError(null);
    addM.mutate(
      { sessionId, kind, amount: value, label: label.trim() },
      {
        onSuccess: () => {
          setAmount('');
          setLabel('');
        },
      },
    );
  }

  return (
    <View
      style={{
        marginTop: 24,
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900], marginBottom: 12 }}>
        Ajouter un mouvement
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {KINDS.map((k) => {
          const active = kind === k.value;
          return (
            <Pressable
              key={k.value}
              onPress={() => setKind(k.value)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 9,
                borderRadius: radius.md,
                backgroundColor: active ? colors.ambre[500] : colors.white,
                borderWidth: 1,
                borderColor: active ? colors.ambre[500] : colors.paper[100],
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: active ? colors.white : colors.ink[900] }}>
                {k.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FormField
        label="Montant (TND)"
        required
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.000"
        error={error ?? undefined}
      />
      <FormField label="Libellé" required value={label} onChangeText={setLabel} placeholder="ex. Vente goûter" />
      <Button label="Ajouter le mouvement" onPress={submit} loading={addM.isPending} />
      {addM.error ? (
        <Text style={{ fontSize: 13, color: colors.status.danger500, marginTop: 8 }}>
          Erreur : {(addM.error as Error).message}
        </Text>
      ) : null}
    </View>
  );
}
