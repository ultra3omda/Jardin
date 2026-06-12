import { Stack } from 'expo-router';

import { colors, fonts } from '@klasso/ui-mobile';

/**
 * Espace parent (hors barre d'onglets) : emploi du temps + paiements,
 * atteints depuis les actions rapides du tableau de bord parent.
 */
export default function ParentLayout() {
  const header = {
    headerShown: true as const,
    headerTintColor: colors.ink[900],
    headerStyle: { backgroundColor: colors.surface },
    headerTitleStyle: { fontFamily: fonts.displayBold, color: colors.ink[900] },
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
      <Stack.Screen name="homework" options={{ ...header, title: 'Devoirs' }} />
      <Stack.Screen name="observations" options={{ ...header, title: 'Observations' }} />
      <Stack.Screen name="canteen" options={{ ...header, title: 'Cantine' }} />
      <Stack.Screen name="activities" options={{ ...header, title: 'Activités' }} />
      <Stack.Screen name="appointments" options={{ ...header, title: 'Rendez-vous' }} />
    </Stack>
  );
}
