import { Stack } from 'expo-router';

import { colors } from '@klasso/ui-mobile';

/**
 * Stack for the Classes section: the list (index) is the tab target; the
 * roll-call (attendance/[id]) pushes on top. Keeps a single "Classes" tab.
 */
export default function ClassesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper[50] },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="schedule"
        options={{
          headerShown: true,
          title: 'Mon emploi du temps',
          headerTintColor: colors.ink[900],
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="attendance/[id]"
        options={{
          headerShown: true,
          title: "Faire l'appel",
          headerTintColor: colors.ink[900],
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}
