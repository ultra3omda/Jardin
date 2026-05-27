import { Tabs } from 'expo-router';

import { colors } from '@klasso/ui-mobile';
import { getMobileTabs } from '@/lib/tabs';
import { useUnreadCount } from '@/lib/api/notifications';

export default function AppLayout() {
  const tabs = getMobileTabs();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

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
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarBadge:
              tab.name === 'notifications' && unreadCount > 0 ? unreadCount : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}
