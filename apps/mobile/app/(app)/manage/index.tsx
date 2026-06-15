import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, radius } from '@klasso/ui-mobile';

import { groupByDomain, MANAGE_ENTRIES } from '@/lib/manage-hub';

/** Admin management hub — entries grouped by domain. */
export default function ManageHubScreen() {
  const groups = groupByDomain(MANAGE_ENTRIES);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 12 }}>
        Gérez votre établissement directement depuis le mobile.
      </Text>

      {groups.map((group) => (
        <View key={group.domain} style={{ marginBottom: 18 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: colors.ink[300],
              marginBottom: 8,
            }}
          >
            {group.label}
          </Text>

          {group.entries.map((e) => (
            <Pressable
              key={e.route}
              onPress={() => router.push(e.route as never)}
              accessibilityRole="button"
              accessibilityLabel={e.title}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 16,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: e.color + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={e.icon} size={22} color={e.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>{e.title}</Text>
                <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>{e.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.ink[300]} />
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
