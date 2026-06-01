import { Stack } from 'expo-router';

import { colors } from '@klasso/ui-mobile';

/** Bulletin detail lives in its own Stack so it never registers as a tab. */
export default function BulletinLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper[50] },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
