import { Stack } from 'expo-router';

import { colors } from '@klasso/ui-mobile';

/**
 * Stack for the Pedagogy section: the role dashboard (index) is the tab target;
 * evaluation management screens push on top. Keeps a single "Pédagogie" tab.
 */
export default function PedagogyLayout() {
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
      <Stack.Screen name="index" />
      <Stack.Screen name="evaluations/index" options={{ ...header, title: 'Évaluations' }} />
      <Stack.Screen name="evaluations/new" options={{ ...header, title: 'Nouvelle évaluation' }} />
      <Stack.Screen name="evaluations/[id]" options={{ ...header, title: 'Saisie des notes' }} />
    </Stack>
  );
}
