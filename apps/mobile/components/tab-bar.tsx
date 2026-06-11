import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@klasso/ui-mobile';
import { useUnreadCount } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/auth/store';
import { getTabsForRole } from '@/lib/tabs';

/** Inactive "-outline" icon → its filled variant when the tab is active. */
function filledName(name: string): string {
  return name.endsWith('-outline') ? name.replace('-outline', '') : name;
}

/**
 * V7 premium tab bar. Renders the connected role's tabs with a soft tinted
 * "pill" behind the active item, the brand accent on the active icon/label,
 * a notifications badge, and proper home-indicator inset. Navigation logic is
 * unchanged — it just restyles the default bottom bar.
 */
export function MobileTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const role = useAuthStore((s) => s.user?.role);
  const { data: unread } = useUnreadCount();
  const tabs = getTabsForRole(role ?? 'STAFF');
  const activeName = state.routes[state.index]?.name;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: 'rgba(15,20,25,0.06)',
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingHorizontal: 4,
      }}
    >
      {tabs.map((tab) => {
        const route = state.routes.find((r) => r.name === tab.name);
        if (!route) return null;

        const isActive = activeName === tab.name;
        const count = tab.name === 'notifications' ? unread?.count ?? 0 : 0;
        const tint = isActive ? colors.ambre[600] : colors.navy[500];

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route!.key,
            canPreventDefault: true,
          });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(route!.name);
          }
        }

        return (
          <Pressable
            key={tab.name}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            android_ripple={{ color: 'rgba(242,104,63,0.12)', borderless: true }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 2 }}
          >
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 4,
                borderRadius: 14,
                backgroundColor: isActive ? colors.ambre[50] : 'transparent',
              }}
            >
              <Ionicons
                name={(isActive ? filledName(tab.icon) : tab.icon) as never}
                size={22}
                color={tint}
              />
              {count > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: 8,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: colors.ambre[500],
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: 9, fontFamily: fonts.bodyBold }}>
                    {count > 9 ? '9+' : count}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{ fontSize: 10, fontFamily: fonts.bodySemibold, color: tint }}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
