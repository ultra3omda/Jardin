import { Stack } from 'expo-router';

import { colors, fonts } from '@klasso/ui-mobile';

/**
 * Stack du module COMMERCIAL : la liste des organisations (index) est la cible
 * de l'onglet, la création (new) et le détail ([id]) se poussent par-dessus.
 * Un seul onglet "Organisations" plutôt qu'un onglet par fichier.
 */
export default function CommercialLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper[50] },
        headerTitleStyle: { fontFamily: fonts.displayBold, color: colors.ink[900] },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="new"
        options={{
          headerShown: true,
          title: 'Nouvelle organisation',
          headerTintColor: colors.ink[900],
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: 'Organisation',
          headerTintColor: colors.ink[900],
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}
