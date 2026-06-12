import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, radius } from '@klasso/ui-mobile';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Entry {
  route: string;
  title: string;
  subtitle: string;
  icon: IoniconName;
  color: string;
}

const ENTRIES: Entry[] = [
  {
    route: '/(app)/manage/directory',
    title: 'Annuaire',
    subtitle: 'Enseignants, parents, personnel',
    icon: 'people-outline',
    color: '#3b82f6',
  },
  {
    route: '/(app)/manage/classes',
    title: 'Classes',
    subtitle: 'Créer une classe, affecter un enseignant',
    icon: 'school-outline',
    color: '#22c55e',
  },
  {
    route: '/(app)/manage/subjects',
    title: 'Matières',
    subtitle: 'Référentiel des matières',
    icon: 'book-outline',
    color: '#a78bfa',
  },
  {
    route: '/(app)/manage/canteen',
    title: 'Cantine',
    subtitle: 'Menus de la semaine',
    icon: 'restaurant-outline',
    color: '#f59e0b',
  },
  {
    route: '/(app)/manage/activities',
    title: 'Activités',
    subtitle: 'Ateliers, sorties, éveil',
    icon: 'color-palette-outline',
    color: '#ec4899',
  },
  {
    route: '/(app)/manage/announcements',
    title: 'Annonces',
    subtitle: 'Communiquer avec parents & équipe',
    icon: 'megaphone-outline',
    color: '#0ea5e9',
  },
  {
    route: '/(app)/manage/finance',
    title: 'Finances',
    subtitle: 'Factures & paiements',
    icon: 'card-outline',
    color: '#14b8a6',
  },
  {
    route: '/(app)/manage/caisse',
    title: 'Caisse',
    subtitle: 'Caisse du jour & clôture',
    icon: 'cash-outline',
    color: '#02a896',
  },
  {
    route: '/(app)/manage/unpaid',
    title: 'Impayés',
    subtitle: 'Échéances non réglées & relances',
    icon: 'alert-circle-outline',
    color: '#ef4444',
  },
  {
    route: '/(app)/manage/transport',
    title: 'Transport',
    subtitle: 'Lignes de bus & chauffeurs',
    icon: 'bus-outline',
    color: '#f97316',
  },
  {
    route: '/(app)/manage/health',
    title: 'Santé',
    subtitle: 'Dossiers médicaux (RGPD)',
    icon: 'medkit-outline',
    color: '#ef4444',
  },
];

/** Admin management hub menu. */
export default function ManageHubScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 16 }}>
        Gérez votre établissement directement depuis le mobile.
      </Text>
      {ENTRIES.map((e) => (
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
    </ScrollView>
  );
}
