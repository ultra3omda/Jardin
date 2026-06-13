import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, radius } from '@klasso/ui-mobile';
import { IncidentsTab } from '@/components/security/incidents-tab';
import { VisitorsTab } from '@/components/security/visitors-tab';
import { DrillsTab } from '@/components/security/drills-tab';

type Tab = 'incidents' | 'visitors' | 'drills';

const TABS: { key: Tab; label: string }[] = [
  { key: 'incidents', label: 'Incidents' },
  { key: 'visitors', label: 'Visiteurs' },
  { key: 'drills', label: 'Exercices' },
];

/** Sécurité : incidents, registre visiteurs, exercices (admin / personnel). */
export default function ManageSecurityScreen() {
  const [tab, setTab] = useState<Tab>('incidents');

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                borderRadius: radius.md,
                backgroundColor: active ? colors.ambre[500] : colors.white,
                borderWidth: 1,
                borderColor: active ? colors.ambre[500] : colors.paper[100],
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: active ? colors.white : colors.ink[900] }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'incidents' ? <IncidentsTab /> : tab === 'visitors' ? <VisitorsTab /> : <DrillsTab />}
      </View>
    </View>
  );
}
