import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/api/client';
import { login } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/auth/store';
import { useTenantStore } from '@/lib/tenant/store';
import { DEFAULT_BRAND } from '@ecole-saas/shared';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const tenantSlug = useTenantStore((s) => s.slug);
  const tenantName = useTenantStore((s) => s.name);
  const brand = useTenantStore((s) => s.brand);

  const primaryColor = brand?.primaryColor ?? DEFAULT_BRAND.primaryColor;
  const logoUrl = brand?.logoUrl;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      const session = await login({
        email: email.trim(),
        password,
        tenantSlug: tenantSlug ?? undefined,
      });
      setSession({
        accessToken: session.accessToken,
        user: session.user,
        tenant: session.tenant,
      });
      router.replace('/(app)/dashboard');
    } catch (err: unknown) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 401) {
        Alert.alert('Erreur', t('auth.errorInvalid'));
      } else {
        Alert.alert('Erreur', t('auth.errorNetwork'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleChangeSchool() {
    router.replace('/(onboarding)/school-code');
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        {/* Logo ou nom de l'école */}
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 72, height: 72, alignSelf: 'center', marginBottom: 8, borderRadius: 12 }}
            resizeMode="contain"
          />
        ) : null}
        <Text
          className="mb-1 text-center text-2xl font-bold"
          style={{ color: primaryColor }}
        >
          {tenantName ?? 'Klasso'}
        </Text>
        <Text className="mb-10 text-center text-base text-gray-500">
          {t('auth.title')}
        </Text>

        {/* Email */}
        <TextInput
          className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          placeholder={t('auth.email')}
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          editable={!isLoading}
        />

        {/* Password */}
        <TextInput
          className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          placeholder={t('auth.password')}
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          editable={!isLoading}
        />

        {/* Bouton Se connecter (couleur brand) */}
        <TouchableOpacity
          className="mb-4 items-center rounded-xl py-4"
          style={{
            backgroundColor: primaryColor,
            opacity: isLoading || !email.trim() || !password ? 0.6 : 1,
          }}
          onPress={handleLogin}
          disabled={isLoading || !email.trim() || !password}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {t('auth.submit')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Changer d'école */}
        <TouchableOpacity onPress={handleChangeSchool} disabled={isLoading}>
          <Text className="text-center text-sm text-gray-400">
            {t('auth.changeSchool')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
