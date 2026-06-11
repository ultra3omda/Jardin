import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@klasso/ui-mobile';

import { useAuthStore } from '@/lib/auth/store';
import { JournalSection } from '@/components/school-life/journal-section';
import { ActivitiesSection } from '@/components/school-life/activities-section';
import { CanteenSection } from '@/components/school-life/canteen-section';

type Segment = 'journal' | 'activities' | 'canteen';

const SEGMENT_LABELS: Record<Segment, string> = {
  journal: 'Journal',
  activities: 'Activités',
  canteen: 'Cantine',
};

export default function SchoolLifeScreen() {
  const insets = useSafeAreaInsets();
  const role = useAuthStore((s) => s.user?.role);
  const tenantType = useAuthStore((s) => s.tenant?.type);

  // Segments adapted to RBAC (§4.8): teachers have no canteen access.
  const segments: Segment[] = useMemo(() => {
    if (role === 'PARENT') return ['journal', 'activities', 'canteen'];
    return ['journal', 'activities'];
  }, [role]);

  const [active, setActive] = useState<Segment>('journal');
  const current = segments.includes(active) ? active : segments[0];

  const title = tenantType === 'KINDERGARTEN' ? 'Cahier de liaison' : 'Vie scolaire';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 32 }}
    >
      <Text style={{ fontSize: 24, fontFamily: fonts.displayBold, color: colors.ink[900], marginBottom: 12 }}>
        {title}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.paper[100],
          borderRadius: radius.md,
          padding: 4,
          marginBottom: 16,
        }}
      >
        {segments.map((seg) => {
          const isActive = seg === current;
          return (
            <Pressable
              key={seg}
              onPress={() => setActive(seg)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: radius.sm,
                backgroundColor: isActive ? colors.surface : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? colors.ink[900] : colors.ink[500],
                }}
              >
                {SEGMENT_LABELS[seg]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {current === 'journal' && <JournalSection />}
      {current === 'activities' && <ActivitiesSection />}
      {current === 'canteen' && <CanteenSection />}
    </ScrollView>
  );
}
