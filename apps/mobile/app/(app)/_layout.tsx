import { Tabs } from 'expo-router';

import { colors } from '@klasso/ui-mobile';
import { getMobileTabs } from '@/lib/tabs';

export default function AppLayout() {
  const tabs = getMobileTabs();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ambre[500],
        tabBarInactiveTintColor: colors.navy[700],
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.paper[100],
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}
