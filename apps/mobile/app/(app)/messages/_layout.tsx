import { Stack } from 'expo-router';

import { colors, fonts } from '@klasso/ui-mobile';

/** Stack for Messaging: conversation list (index) + thread ([id]). */
export default function MessagesLayout() {
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
        name="[id]"
        options={{
          headerShown: true,
          title: 'Conversation',
          headerTintColor: colors.ink[900],
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          headerShown: true,
          title: 'Nouvelle conversation',
          headerTintColor: colors.ink[900],
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}
