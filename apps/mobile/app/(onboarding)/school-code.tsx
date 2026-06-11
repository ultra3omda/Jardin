import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ZelligePattern, colors, fonts, radius, useTheme } from '@klasso/ui-mobile';
import { ApiError } from '@/lib/api/client';
import { getTenantBrand } from '@/lib/api/tenant';
import { saveTenantSlug } from '@/lib/auth/secure-storage';
import { useTenantStore } from '@/lib/tenant/store';

const DEMO_SHORTCUTS = [
  { slug: 'demo-ecole', label: 'École primaire (démo)' },
  { slug: 'demo-maternelle', label: "Jardin d'enfants (démo)" },
] as const;

export default function SchoolCodeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setTenant = useTenantStore((s) => s.setTenant);

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingShortcut, setLoadingShortcut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitSlug(slug: string) {
    setError(null);
    try {
      const data = await getTenantBrand(slug);
      await saveTenantSlug(slug);
      setTenant(data.slug, data.name, data.brand);
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        status === 404
          ? 'Code école introuvable. Vérifiez et réessayez.'
          : 'Erreur réseau. Vérifiez votre connexion.',
      );
    }
  }

  async function handleContinue() {
    const slug = code.trim().toLowerCase();
    if (!slug || isLoading || loadingShortcut) return;
    setIsLoading(true);
    await submitSlug(slug);
    setIsLoading(false);
  }

  async function handleShortcut(slug: string) {
    if (isLoading || loadingShortcut) return;
    setLoadingShortcut(slug);
    await submitSlug(slug);
    setLoadingShortcut(null);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero block — Médina terracotta + zellige (pre-tenant default) */}
        <View
          style={{
            backgroundColor: theme.primaryDark,
            padding: 24,
            paddingTop: 64,
            paddingBottom: 44,
            overflow: 'hidden',
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <ZelligePattern color={colors.gold[100]} opacity={0.12} />
          <Text style={{ color: colors.white, fontSize: 26, fontFamily: fonts.displayBold }}>
            📘 Klasso
          </Text>
          <Text
            style={{
              color: colors.gold[100],
              fontSize: 12,
              marginTop: 2,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              fontFamily: fonts.bodySemibold,
            }}
          >
            L'école à l'ère numérique
          </Text>
          <Text
            style={{
              color: colors.white,
              fontSize: 25,
              fontFamily: fonts.display,
              lineHeight: 32,
              marginTop: 20,
            }}
          >
            Bienvenue sur{' '}
            <Text style={{ color: colors.gold[100], fontFamily: fonts.displayBold }}>Klasso</Text>
          </Text>
        </View>

        {/* Form block */}
        <View style={{ padding: 24, gap: 14 }}>
          <Text
            style={{
              fontSize: 20,
              fontFamily: fonts.displayBold,
              color: colors.ink[900],
              textAlign: 'center',
            }}
          >
            Code de votre établissement
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center' }}>
            Entrez le code fourni par votre école
          </Text>

          {error && (
            <View
              style={{
                backgroundColor: '#fee2e2',
                borderRadius: radius.md,
                padding: 12,
              }}
            >
              <Text style={{ color: '#991b1b', fontSize: 13 }}>{error}</Text>
            </View>
          )}

          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="ex : mon-ecole"
            placeholderTextColor={colors.ink[300]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            editable={!isLoading && !loadingShortcut}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: 14,
              fontSize: 14,
              color: colors.ink[900],
              borderWidth: 1,
              borderColor: colors.paper[100],
            }}
          />

          <Button
            label="Continuer"
            onPress={handleContinue}
            loading={isLoading}
            disabled={!code.trim() || !!loadingShortcut}
          />

          {/* Demo shortcuts */}
          <View
            style={{
              marginTop: 24,
              padding: 16,
              backgroundColor: colors.paper[100],
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.paper[100],
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1,
                color: colors.ink[500],
                textAlign: 'center',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Accès rapide démonstration
            </Text>
            <View style={{ gap: 8 }}>
              {DEMO_SHORTCUTS.map((s) => (
                <Button
                  key={s.slug}
                  label={s.label}
                  variant="secondary"
                  onPress={() => handleShortcut(s.slug)}
                  loading={loadingShortcut === s.slug}
                  disabled={isLoading || !!loadingShortcut}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
