import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, EmptyState, FormField, colors, radius } from '@klasso/ui-mobile';
import { useOpenSession } from '@/lib/api/cash-register';

/** Formulaire d'ouverture de la caisse du jour (quand aucune session ouverte). */
export function OpenCaisseForm() {
  const openM = useOpenSession();
  const [openingFloat, setOpeningFloat] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const amount = Number(openingFloat.replace(',', '.').trim());
    if (openingFloat.trim().length === 0 || Number.isNaN(amount) || amount < 0) {
      setError('Saisissez un fonds d’ouverture valide.');
      return;
    }
    setError(null);
    openM.mutate({ openingFloat: amount });
  }

  return (
    <View>
      <EmptyState icon="cash-outline" title="Aucune caisse ouverte" description="Ouvrez la caisse du jour pour enregistrer les mouvements." />
      <View
        style={{
          marginTop: 8,
          backgroundColor: colors.white,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.paper[100],
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900], marginBottom: 12 }}>
          Ouvrir la caisse
        </Text>
        <FormField
          label="Fonds d'ouverture (TND)"
          required
          value={openingFloat}
          onChangeText={setOpeningFloat}
          keyboardType="decimal-pad"
          placeholder="0.000"
          error={error ?? undefined}
          hint="Montant en caisse au démarrage de la journée."
        />
        <Button label="Ouvrir la caisse" onPress={submit} loading={openM.isPending} />
        {openM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500, marginTop: 8 }}>
            Erreur : {(openM.error as Error).message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
