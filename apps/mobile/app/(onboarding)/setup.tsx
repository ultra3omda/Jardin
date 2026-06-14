import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { Button, FormField, ZelligePattern, colors, fonts, useTheme } from '@klasso/ui-mobile';
import { completeOnboarding } from '@/lib/api/onboarding';
import { useAuthStore } from '@/lib/auth/store';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Onboarding bloquant (SCHOOL_ADMIN) — version mobile (cf. ADR 0016 amendé).
 * Confirme le nom de l'établissement + une couleur principale optionnelle, puis
 * bascule le tenant en ACTIVE et débloque l'app.
 */
export default function OnboardingSetupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const tenant = useAuthStore((s) => s.tenant);
  const patchTenant = useAuthStore((s) => s.patchTenant);

  const [name, setName] = useState(tenant?.name ?? '');
  const [primaryColor, setPrimaryColor] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const m = useMutation({
    mutationFn: () => {
      const brand = HEX_RE.test(primaryColor) ? { primaryColor } : undefined;
      return completeOnboarding({ name: name.trim(), brand });
    },
    onSuccess: () => {
      patchTenant({
        onboardingCompleted: true,
        status: 'ACTIVE',
        name: name.trim(),
        ...(HEX_RE.test(primaryColor) ? { brand: { primaryColor } } : {}),
      });
      router.replace('/(app)/dashboard');
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Nom requis (2 caractères min.)';
    if (primaryColor && !HEX_RE.test(primaryColor)) e.primaryColor = 'Format #RRGGBB';
    setErrors(e);
    if (Object.keys(e).length) return;
    m.mutate();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View
          style={{
            backgroundColor: theme.primaryDark,
            padding: 24,
            paddingTop: 64,
            paddingBottom: 40,
            overflow: 'hidden',
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <ZelligePattern color={colors.gold[100]} opacity={0.12} />
          <Text style={{ color: colors.white, fontSize: 25, fontFamily: fonts.displayBold }}>
            Bienvenue 👋
          </Text>
          <Text
            style={{
              color: colors.white,
              fontSize: 22,
              fontFamily: fonts.display,
              lineHeight: 30,
              marginTop: 12,
            }}
          >
            Configurons votre{' '}
            <Text style={{ color: colors.gold[100], fontFamily: fonts.displayBold }}>
              établissement
            </Text>
            .
          </Text>
        </View>

        <View style={{ padding: 24, gap: 4 }}>
          <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 8 }}>
            Quelques informations pour personnaliser votre espace. Vous pourrez tout modifier plus
            tard dans les réglages.
          </Text>

          <FormField
            label="Nom de l'établissement"
            required
            value={name}
            onChangeText={setName}
            error={errors.name}
            placeholder="École Saint-Pierre"
          />
          <FormField
            label="Couleur principale (optionnel)"
            value={primaryColor}
            onChangeText={setPrimaryColor}
            error={errors.primaryColor}
            placeholder="#4f46e5"
            autoCapitalize="none"
            hint="Code couleur #RRGGBB — sert au thème de l'app."
          />

          {m.error ? (
            <Text style={{ fontSize: 13, color: colors.status.danger500, marginBottom: 4 }}>
              Erreur : {(m.error as Error).message}
            </Text>
          ) : null}

          <View style={{ marginTop: 12 }}>
            <Button
              label="Terminer la configuration"
              onPress={submit}
              loading={m.isPending}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
