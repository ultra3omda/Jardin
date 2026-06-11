import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button, ZelligePattern, colors, fonts, radius, useTheme } from '@klasso/ui-mobile';
import { deleteTenantSlug } from '@/lib/auth/secure-storage';
import { ApiError } from '@/lib/api/client';
import { login } from '@/lib/api/auth';
import { demoLogin, type DemoPersona } from '@/lib/api/demo-login';
import { useAuthStore } from '@/lib/auth/store';
import { useTenantStore } from '@/lib/tenant/store';
import { getDemoPersonas } from '@/lib/personas';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const tenantSlug = useTenantStore((s) => s.slug);

  async function handleChangeSchool() {
    await deleteTenantSlug();
    router.replace('/(onboarding)/school-code');
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPersona, setLoadingPersona] = useState<DemoPersona | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setError(null);
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
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Email ou mot de passe incorrect.'
          : 'Erreur de connexion.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDemo(persona: DemoPersona) {
    if (loadingPersona || isLoading) return;
    setLoadingPersona(persona);
    setError(null);
    try {
      const session = await demoLogin(persona);
      setSession({
        accessToken: session.accessToken,
        user: session.user,
        tenant: session.tenant,
      });
      router.replace('/(app)/dashboard');
    } catch {
      setError('Démo indisponible. Réessaye.');
      setLoadingPersona(null);
    }
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
        {/* Hero block — establishment colour (Médina by default) + zellige */}
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
            La plateforme qui{' '}
            <Text style={{ color: colors.gold[100], fontFamily: fonts.displayBold }}>simplifie</Text>{' '}
            votre établissement.
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
            Bienvenue
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center' }}>
            Connectez-vous à votre espace
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
            value={email}
            onChangeText={setEmail}
            placeholder="vous@etablissement.tn"
            placeholderTextColor={colors.ink[300]}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
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

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mot de passe"
            placeholderTextColor={colors.ink[300]}
            secureTextEntry
            autoComplete="password"
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
            label="Se connecter"
            onPress={handleLogin}
            loading={isLoading}
            disabled={!email.trim() || !password}
          />

          {/* Demo accounts block */}
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
              Comptes de démonstration
            </Text>
            <View style={{ gap: 8 }}>
              {getDemoPersonas(tenantSlug).map((p) => (
                <Button
                  key={p.persona}
                  label={p.label}
                  variant="secondary"
                  onPress={() => handleDemo(p.persona)}
                  loading={loadingPersona === p.persona}
                  disabled={!!loadingPersona || isLoading}
                />
              ))}
            </View>
          </View>

          {/* Change school link */}
          <TouchableOpacity onPress={handleChangeSchool} style={{ paddingVertical: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: colors.ink[300] }}>
              Changer d'établissement →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
