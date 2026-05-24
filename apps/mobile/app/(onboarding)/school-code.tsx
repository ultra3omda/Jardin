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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/api/client';
import { getTenantBrand } from '@/lib/api/tenant';
import { saveTenantSlug } from '@/lib/auth/secure-storage';
import { useTenantStore } from '@/lib/tenant/store';

export default function SchoolCodeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setTenant = useTenantStore((s) => s.setTenant);

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleContinue() {
    const slug = code.trim().toLowerCase();
    if (!slug) return;

    setIsLoading(true);
    try {
      const data = await getTenantBrand(slug);
      // Persister le slug pour les prochains démarrages
      await saveTenantSlug(slug);
      // Mettre à jour le store
      setTenant(data.slug, data.name, data.brand);
      // Naviguer vers le login
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 404) {
        Alert.alert('Introuvable', t('onboarding.errorNotFound'));
      } else {
        Alert.alert('Erreur', t('onboarding.errorNetwork'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        {/* Logo / Titre */}
        <Text className="mb-2 text-center text-3xl font-bold text-indigo-600">
          Klasso
        </Text>
        <Text className="mb-10 text-center text-base text-gray-500">
          {t('onboarding.subtitle')}
        </Text>

        {/* Input code école */}
        <TextInput
          className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          placeholder={t('onboarding.placeholder')}
          placeholderTextColor="#9ca3af"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          editable={!isLoading}
        />

        {/* Bouton */}
        <TouchableOpacity
          className="items-center rounded-xl bg-indigo-600 py-4"
          onPress={handleContinue}
          disabled={isLoading || !code.trim()}
          style={{ opacity: isLoading || !code.trim() ? 0.6 : 1 }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {t('onboarding.continue')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
