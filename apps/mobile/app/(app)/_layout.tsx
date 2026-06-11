import { Tabs } from 'expo-router';

import { ALL_TAB_NAMES, NON_TAB_ROUTES } from '@/lib/tabs';
import { usePushNotifications } from '@/lib/notifications/use-push-notifications';
import { MobileTabBar } from '@/components/tab-bar';

export default function AppLayout() {
  // Register the device push token and handle incoming/ tapped notifications
  // for the authenticated session.
  usePushNotifications();

  // The custom <MobileTabBar /> reads the connected role and renders only its
  // tabs, so screens are registered plainly here (detail/non-role routes stay
  // routable but never appear in the bar).
  return (
    <Tabs
      tabBar={(props) => <MobileTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift' }}
    >
      {[...ALL_TAB_NAMES, ...NON_TAB_ROUTES].map((name) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}
