import { Stack } from 'expo-router';

import { colors } from '@klasso/ui-mobile';

/**
 * Espace parent (hors barre d'onglets) : emploi du temps + paiements,
 * atteints depuis les actions rapides du tableau de bord parent.
 */
export default function ParentLayout() {
  const header = {
    headerShown: true as const,
    headerTintColor: colors.ink[900],
    headerStyle: { backgroundColor: colors.surface },
  };
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper[50] },
      }}
    >
      <Stack.Screen name="schedule" options={{ ...header, title: 'Emploi du temps' }} />
      <Stack.Screen name="payments" options={{ ...header, title: 'Paiements' }} />
    </Stack>
  );
}
