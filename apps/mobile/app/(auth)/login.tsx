import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button, colors, radius } from '@klasso/ui-mobile';
import { ApiError } from '@/lib/api/client';
import { login } from '@/lib/api/auth';
import { demoLogin, type DemoPersona } from '@/lib/api/demo-login';
import { useAuthStore } from '@/lib/auth/store';
import { useTenantStore } from '@/lib/tenant/store';
import { MOBILE_DEMO_PERSONAS } from '@/lib/personas';

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const tenantSlug = useTenantStore((s) => s.slug);

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
        {/* Hero block — navy */}
        <View
          style={{
            backgroundColor: colors.navy[900],
            padding: 24,
            paddingTop: 64,
            paddingBottom: 40,
          }}
        >
          <Text style={{ color: colors.white, fontSize: 24, fontWeight: '700' }}>
            📘 Klasso
          </Text>
          <Text
            style={{
              color: colors.navy[500],
              fontSize: 12,
              marginTop: 2,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            L'école à l'ère numérique
          </Text>
          <Text
            style={{
              color: colors.white,
              fontSize: 22,
              fontWeight: '600',
              lineHeight: 28,
              marginTop: 20,
            }}
          >
            La plateforme qui{' '}
            <Text style={{ color: colors.ambre[500] }}>simplifie</Text> votre
            établissement.
          </Text>
        </View>

        {/* Form block */}
        <View style={{ padding: 24, gap: 14 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
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
              {MOBILE_DEMO_PERSONAS.map((p) => (
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
