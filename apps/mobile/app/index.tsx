import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import { needsOnboarding } from '@/lib/auth/onboarding-gate';
import { refreshSession } from '@/lib/api/auth';

/**
 * Boot router — Phase D (auto-tenant).
 *
 * Tente un refresh silencieux du JWT :
 *  - Succès → hydrate AuthStore et redirige vers (app)/dashboard
 *  - Échec  → redirige directement vers (auth)/login
 *
 * Plus de pré-sélection d'établissement : le tenant est résolu côté API à
 * partir de l'email lors du login (sélecteur si l'email est multi-tenant).
 *
 * Affiche un spinner pendant le boot (~ <1s en pratique).
 */
export default function Index() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    async function boot() {
      // Tenter un refresh silencieux ; le tenant est résolu au login.
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
      if (needsOnboarding(session.user, session.tenant)) {
        router.replace('/(onboarding)/setup');
        return;
      }
      router.replace('/(app)/dashboard');
    }

    // V1.7-A2 fix : si boot() throw (ex: storage natif cassé sur web), on
    // hydrate quand même + redirige vers le login plutôt que de rester bloqué
    // sur le spinner.
    boot().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Boot router failed:', err);
      setHydrated(true);
      router.replace('/(auth)/login');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spinner pendant le boot
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.navy[900],
      }}
    >
      <ActivityIndicator size="large" color={colors.ambre[500]} />
    </View>
  );
}
