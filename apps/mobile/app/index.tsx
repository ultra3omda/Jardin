import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';
import { getSavedTenantSlug } from '@/lib/auth/secure-storage';
import { refreshSession } from '@/lib/api/auth';

/**
 * Boot router — Phase C (smart).
 *
 * 1. Lit le slug tenant sauvegardé en SecureStore
 *    - Aucun  → redirige vers (onboarding)/school-code
 * 2. Tente un refresh silencieux du JWT
 *    - Échec  → redirige vers (auth)/login
 *    - Succès → hydrate AuthStore et redirige vers (app)/dashboard
 *
 * Affiche un spinner pendant le boot (~ <1s en pratique).
 */
export default function Index() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    async function boot() {
      // 1. Récupérer le slug sauvegardé
      const savedSlug = await getSavedTenantSlug();

      if (!savedSlug) {
        setHydrated(true);
        router.replace('/(onboarding)/school-code');
        return;
      }

      // 2. Tenter un refresh silencieux
      const session = await refreshSession();
      setHydrated(true);

      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      setSession({
        accessToken: session.accessToken,
        user: session.user,
        tenant: session.tenant,
      });
      router.replace('/(app)/dashboard');
    }

    // V1.7-A2 fix : si boot() throw (ex: storage native cassé sur web), on
    // doit quand même hydrate + rediriger vers onboarding plutôt que rester
    // bloqué sur le spinner. Le user pourra retenter depuis l'écran code école.
    boot().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Boot router failed:', err);
      setHydrated(true);
      router.replace('/(onboarding)/school-code');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spinner pendant le boot
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}
