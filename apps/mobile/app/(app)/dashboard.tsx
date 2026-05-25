import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/lib/auth/store';
import { useTenantStore } from '@/lib/tenant/store';
import { logout } from '@/lib/api/auth';
import { DEFAULT_BRAND } from '@ecole-saas/shared';

const PERSONA = process.env.EXPO_PUBLIC_PERSONA ?? 'dev';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const tenantName = useTenantStore((s) => s.name);
  const brand = useTenantStore((s) => s.brand);
  const clearTenant = useTenantStore((s) => s.clear);

  const primaryColor = brand?.primaryColor ?? DEFAULT_BRAND.primaryColor;

  async function handleLogout() {
    await logout();
    clear();
    clearTenant();
    router.replace('/(onboarding)/school-code');
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header brand */}
      <View
        className="px-6 pb-6 pt-14"
        style={{ backgroundColor: primaryColor }}
      >
        <Text className="text-lg font-bold text-white">
          {tenantName ?? 'Klasso'}
        </Text>
      </View>

      <View className="px-6 py-8">
        {/* Greeting */}
        <Text className="mb-2 text-2xl font-bold text-gray-900">
          {t('dashboard.greeting', {
            name: user ? `${user.firstName} ${user.lastName}` : '...',
          })}
        </Text>

        <Text className="mb-1 text-base text-gray-600">
          {t('dashboard.role', { role: user?.role ?? '...' })}
        </Text>

        <Text className="mb-8 text-sm text-gray-400">
          {t('dashboard.persona', { persona: PERSONA })}
        </Text>

        {/* V2 — Tile Élèves (toutes personas, RBAC côté API) */}
        <Link href="/(app)/students" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Aller à la liste des élèves"
            className="mb-4 rounded-2xl border border-gray-200 bg-white p-5"
          >
            <Text className="text-3xl">👨‍🎓</Text>
            <Text className="mt-2 text-base font-semibold">Élèves</Text>
            <Text className="text-xs text-gray-500">Liste et fiches détaillées</Text>
          </Pressable>
        </Link>

        {/* Placeholder futurs modules */}
        <View className="mb-6 rounded-2xl bg-gray-50 p-4">
          <Text className="text-center text-gray-400">
            📚 V3+ : Parents · Enseignants · Notes…
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="items-center rounded-xl border border-gray-200 py-4"
          onPress={handleLogout}
        >
          <Text className="text-base text-gray-600">
            {t('dashboard.logout')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
