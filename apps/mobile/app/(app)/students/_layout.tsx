import { Stack } from 'expo-router';

import { colors } from '@klasso/ui-mobile';

/**
 * Stack for the Students section: the list (index) is the tab target, the
 * detail ([id]) pushes on top. Keeping them under one Stack means the parent
 * tab bar shows a single "Élèves" entry instead of one tab per file.
 */
export default function StudentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper[50] },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="new"
        options={{
          headerShown: true,
          title: 'Nouvel élève',
          headerTintColor: colors.ink[900],
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          headerShown: true,
          title: "Modifier l'élève",
          headerTintColor: colors.ink[900],
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}
