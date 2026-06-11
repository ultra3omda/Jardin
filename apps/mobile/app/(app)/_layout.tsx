import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { colors, fonts } from '@klasso/ui-mobile';
import { ALL_TAB_NAMES, NON_TAB_ROUTES, getTabsForRole, type MobileTab } from '@/lib/tabs';
import { useUnreadCount } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/auth/store';
import { usePushNotifications } from '@/lib/notifications/use-push-notifications';

/** Inactive "-outline" icon → filled variant when active. */
function filledName(name: string): string {
  return name.endsWith('-outline') ? name.replace('-outline', '') : name;
}

export default function AppLayout() {
  const role = useAuthStore((s) => s.user?.role);
  const tabs = getTabsForRole(role ?? 'STAFF');
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  // Register the device push token and handle incoming/ tapped notifications
  // for the authenticated session.
  usePushNotifications();

  // Map every potential tab route → its config for the current role (or null
  // when the role doesn't use it, so we can hide it with href:null).
  const byName = new Map<string, MobileTab>(tabs.map((t) => [t.name, t]));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ambre[500],
        tabBarInactiveTintColor: colors.navy[500],
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: 'rgba(15,20,25,0.06)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', fontFamily: fonts.bodySemibold },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      {/* Register every possible tab screen. Those not used by the current role
          are hidden from the bar via href:null (but still routable). */}
      {ALL_TAB_NAMES.map((name) => {
        const tab = byName.get(name);
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={
              tab
                ? {
                    title: tab.label,
                    tabBarBadge:
                      name === 'notifications' && unreadCount > 0 ? unreadCount : undefined,
                    tabBarIcon: ({ color, focused, size }) => (
                      <Ionicons
                        name={(focused ? filledName(tab.icon) : tab.icon) as never}
                        size={size ?? 22}
                        color={color}
                      />
                    ),
                  }
                : { href: null }
            }
          />
        );
      })}

      {/* Detail screens — never shown as tabs. */}
      {NON_TAB_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
