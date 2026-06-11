import { useState } from 'react';
import { Image, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { TenantBrand } from '@ecole-saas/shared';
import { Button, ConfirmDialog, colors, fonts, radius, useTheme } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import { deleteRefreshToken, deleteTenantSlug } from '@/lib/auth/secure-storage';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Keys MUST match the API's UserRole enum (uppercase) — lowercase keys used to
// silently fall through and display the raw 'SCHOOL_ADMIN' string.
const ROLE_LABELS: Record<string, string> = {
  SCHOOL_ADMIN: 'Direction',
  TEACHER: 'Enseignant·e',
  PARENT: 'Parent',
  STAFF: 'Personnel',
  SUPER_ADMIN: 'Super Admin',
  COMMERCIAL: 'Commercial',
};

const TENANT_TYPE_LABELS: Record<string, string> = {
  KINDERGARTEN: "Jardin d'enfants",
  PRIMARY_SCHOOL: 'École primaire',
  MIXED: 'École mixte',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const clear = useAuthStore((s) => s.clear);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // `Alert.alert` is a no-op on react-native-web (our deployed target), so the
  // confirm + logout never fired. Use a cross-platform ConfirmDialog, and force
  // a hard navigation on web where router.replace after clear() is unreliable.
  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await deleteRefreshToken();
      await deleteTenantSlug();
    } catch {
      /* secure-storage best-effort */
    }
    clear();
    if (Platform.OS === 'web') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).location?.assign('/');
    } else {
      router.replace('/(onboarding)/school-code');
    }
  }

  // Only `user` is required. SUPER_ADMIN / COMMERCIAL have no tenant — the
  // establishment card is simply hidden for them.
  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper[50],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.ink[500], fontSize: 14, fontFamily: fonts.body }}>
          Chargement…
        </Text>
      </View>
    );
  }

  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || 'K';
  const logoUrl = (tenant?.brand as Partial<TenantBrand> | null)?.logoUrl ?? null;
  const appVersion = Constants.expoConfig?.version ?? '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16, gap: 16 }}
    >
      {/* Identity header — avatar in the establishment's accent colour */}
      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            borderWidth: 4,
            borderColor: colors.surface,
            shadowColor: colors.ink[900],
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: 5,
          }}
        >
          <Text style={{ color: theme.onPrimary, fontSize: 30, fontFamily: fonts.displayBold }}>
            {initials}
          </Text>
        </View>
        <Text style={{ fontSize: 24, fontFamily: fonts.displayBold, color: colors.ink[900] }}>
          {user.firstName} {user.lastName}
        </Text>
        {/* Role chip in the tenant accent */}
        <View
          style={{
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: theme.primaryTint,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: fonts.bodyBold,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: theme.primary,
            }}
          >
            {ROLE_LABELS[user.role] ?? user.role}
          </Text>
        </View>
        {tenant ? (
          <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 8, fontFamily: fonts.body }}>
            {tenant.name}
          </Text>
        ) : null}
      </View>

      {/* Account card */}
      <SectionCard icon="person-circle-outline" title="Informations du compte">
        <InfoRow icon="mail-outline" label="Email" value={user.email} />
        <InfoRow icon="person-outline" label="Prénom" value={user.firstName} />
        <InfoRow icon="people-outline" label="Nom" value={user.lastName} />
        <InfoRow
          icon="shield-checkmark-outline"
          label="Rôle"
          value={ROLE_LABELS[user.role] ?? user.role}
        />
      </SectionCard>

      {/* Establishment card — hidden for tenant-less roles (super-admin). */}
      {tenant ? (
        <SectionCard icon="business-outline" title="Établissement">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: colors.paper[50],
                }}
                accessibilityLabel={`Logo ${tenant.name}`}
              />
            ) : (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: theme.primaryTint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="school-outline" size={24} color={theme.primary} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ fontSize: 15, fontFamily: fonts.bodySemibold, color: colors.ink[900] }}
                numberOfLines={1}
              >
                {tenant.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2, fontFamily: fonts.body }}>
                {TENANT_TYPE_LABELS[tenant.type] ?? tenant.type} · code {tenant.slug}
              </Text>
            </View>
          </View>
        </SectionCard>
      ) : null}

      {/* Logout — destructive, matches the confirm dialog's red */}
      <View style={{ marginTop: 8 }}>
        <Button label="Se déconnecter" variant="danger" onPress={() => setConfirmOpen(true)} />
      </View>

      {/* App footer */}
      <Text
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: colors.ink[300],
          fontFamily: fonts.body,
          marginTop: 4,
        }}
      >
        Klasso · version {appVersion}
      </Text>

      <ConfirmDialog
        visible={confirmOpen}
        title="Déconnexion"
        message="Voulez-vous vraiment vous déconnecter ?"
        confirmLabel="Déconnecter"
        destructive
        loading={loggingOut}
        onConfirm={confirmLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </ScrollView>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: IoniconName;
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.line,
        shadowColor: colors.ink[900],
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={16} color={theme.primary} />
        <Text
          style={{
            fontSize: 11,
            fontFamily: fonts.bodyBold,
            color: colors.ink[300],
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: IoniconName; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={16} color={colors.ink[300]} />
      <Text style={{ fontSize: 13, color: colors.ink[500], fontFamily: fonts.body }}>{label}</Text>
      <Text
        style={{
          flex: 1,
          fontSize: 13,
          color: colors.ink[900],
          fontFamily: fonts.bodyMedium,
          textAlign: 'right',
          marginLeft: 8,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
