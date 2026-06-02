import { Stack } from 'expo-router';

import { colors } from '@klasso/ui-mobile';

/**
 * Lot 4 — Admin management hub (hidden from the tab bar; reached from the
 * dashboard). Each section is a screen pushed onto this Stack.
 */
export default function ManageLayout() {
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
      <Stack.Screen name="index" options={{ ...header, title: 'Gestion' }} />
      <Stack.Screen name="directory" options={{ ...header, title: 'Annuaire' }} />
      <Stack.Screen name="classes" options={{ ...header, title: 'Classes' }} />
      <Stack.Screen name="subjects" options={{ ...header, title: 'Matières' }} />
      <Stack.Screen name="canteen" options={{ ...header, title: 'Cantine' }} />
      <Stack.Screen name="activities" options={{ ...header, title: 'Activités' }} />
      <Stack.Screen name="announcements" options={{ ...header, title: 'Annonces' }} />
      <Stack.Screen name="finance" options={{ ...header, title: 'Finances' }} />
    </Stack>
  );
}
