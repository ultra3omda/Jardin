import { useState } from 'react';
import {
  Image,
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
import { deleteTenantSlug, saveTenantSlug } from '@/lib/auth/secure-storage';
import { login } from '@/lib/api/auth';
import { interpretLoginError } from '@/lib/auth/login-flow';
import { needsOnboarding } from '@/lib/auth/onboarding-gate';
import type { AuthTenant, AuthUser } from '@/lib/auth/types';
import { TenantPickerModal } from '@/components/auth/tenant-picker-modal';
import { demoLogin, type DemoPersona } from '@/lib/api/demo-login';
import { useAuthStore } from '@/lib/auth/store';
import { useTenantStore } from '@/lib/tenant/store';
import { getDemoPersonas } from '@/lib/personas';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const tenantSlug = useTenantStore((s) => s.slug);
  const tenantName = useTenantStore((s) => s.name);
  const logoUrl = useTenantStore((s) => s.brand?.logoUrl ?? null);

  async function handleChangeSchool() {
    await deleteTenantSlug();
    router.replace('/(onboarding)/school-code');
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPersona, setLoadingPersona] = useState<DemoPersona | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Multi-tenant: slugs to choose from when one email exists in several schools.
  const [tenantChoices, setTenantChoices] = useState<string[] | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);

  // A SCHOOL_ADMIN whose org has not finished onboarding is routed through the
  // blocking setup wizard; everyone else lands on the dashboard.
  function routeAfterLogin(user: AuthUser, tenant: AuthTenant | null) {
    if (needsOnboarding(user, tenant)) {
      router.replace('/(onboarding)/setup');
      return;
    }
    router.replace('/(app)/dashboard');
  }

  // Single login path, used both for the first attempt (no slug → the API
  // resolves the tenant automatically) and for the retry after the user picks
  // an establishment in the multi-tenant case.
  async function runLogin(slug?: string) {
    const session = await login({ email: email.trim(), password, tenantSlug: slug });
    setSession({
      accessToken: session.accessToken,
      user: session.user,
      tenant: session.tenant,
    });
    if (slug) await saveTenantSlug(slug);
    routeAfterLogin(session.user, session.tenant);
  }

  function messageFor(err: unknown): string {
    return interpretLoginError(err).type === 'invalid-credentials'
      ? 'Email ou mot de passe incorrect.'
      : 'Erreur de connexion.';
  }

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      await runLogin();
    } catch (err) {
      const result = interpretLoginError(err);
      if (result.type === 'tenant-required') {
        setTenantChoices(result.slugs);
      } else {
        setError(messageFor(err));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectTenant(slug: string) {
    setPickerLoading(true);
    setError(null);
    try {
      await runLogin(slug);
      setTenantChoices(null);
    } catch (err) {
      setTenantChoices(null);
      setError(messageFor(err));
    } finally {
      setPickerLoading(false);
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
      routeAfterLogin(session.user, session.tenant);
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
          {/* White-label header: the establishment's own logo + name when the
              tenant customised its brand; Klasso platform branding otherwise. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}
                accessibilityLabel={tenantName ? `Logo ${tenantName}` : 'Logo'}
              />
            ) : null}
            <View style={{ flexShrink: 1 }}>
              <Text style={{ color: colors.white, fontSize: 25, fontFamily: fonts.displayBold }}>
                {tenantName ?? '📘 Klasso'}
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
                {tenantName ? 'Propulsé par Klasso' : "L'école à l'ère numérique"}
              </Text>
            </View>
          </View>
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
              Saisir un code établissement →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TenantPickerModal
        visible={tenantChoices !== null}
        slugs={tenantChoices ?? []}
        onSelect={handleSelectTenant}
        onClose={() => setTenantChoices(null)}
        loading={pickerLoading}
      />
    </KeyboardAvoidingView>
  );
}
