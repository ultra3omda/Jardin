import { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, ConfirmDialog, colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import { deleteRefreshToken, deleteTenantSlug } from '@/lib/auth/secure-storage';

const ROLE_LABELS: Record<string, string> = {
  school_admin: 'Directeur / Admin',
  teacher: 'Enseignant',
  parent: 'Parent',
  staff: 'Personnel',
  super_admin: 'Super Admin',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
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
  // establishment card is simply hidden for them (previously this left the
  // whole profile stuck on "Chargement…").
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50], alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.ink[500], fontSize: 14 }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16, gap: 16 }}
    >
      {/* Avatar + name */}
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.navy[900],
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.white, fontSize: 28, fontWeight: '700' }}>
            {user.firstName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink[900] }}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 2 }}>
          {ROLE_LABELS[user.role] ?? user.role}
        </Text>
      </View>

      {/* User info card */}
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radius.lg,
          padding: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: colors.paper[100],
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink[300], textTransform: 'uppercase', letterSpacing: 1 }}>
          Informations du compte
        </Text>
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Prénom" value={user.firstName} />
        <InfoRow label="Nom" value={user.lastName} />
        <InfoRow label="Rôle" value={ROLE_LABELS[user.role] ?? user.role} />
      </View>

      {/* Tenant info card — hidden for tenant-less roles (super-admin). */}
      {tenant ? (
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: radius.lg,
            padding: 16,
            gap: 12,
            borderWidth: 1,
            borderColor: colors.paper[100],
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink[300], textTransform: 'uppercase', letterSpacing: 1 }}>
            Établissement
          </Text>
          <InfoRow label="Nom" value={tenant.name} />
          <InfoRow label="Code" value={tenant.slug} />
        </View>
      ) : null}

      {/* Logout */}
      <View style={{ marginTop: 8 }}>
        <Button label="Se déconnecter" variant="secondary" onPress={() => setConfirmOpen(true)} />
      </View>

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: colors.ink[500] }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.ink[900], fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 8 }}>
        {value}
      </Text>
    </View>
  );
}
