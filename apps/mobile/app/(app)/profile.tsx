import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, colors, radius } from '@klasso/ui-mobile';
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
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const clear = useAuthStore((s) => s.clear);

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          await deleteRefreshToken();
          await deleteTenantSlug();
          clear();
          router.replace('/(onboarding)/school-code');
        },
      },
    ]);
  }

  if (!user || !tenant) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50], alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.ink[500], fontSize: 14 }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 24, gap: 16 }}
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
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink[400], textTransform: 'uppercase', letterSpacing: 1 }}>
          Informations du compte
        </Text>
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Prénom" value={user.firstName} />
        <InfoRow label="Nom" value={user.lastName} />
        <InfoRow label="Rôle" value={ROLE_LABELS[user.role] ?? user.role} />
      </View>

      {/* Tenant info card */}
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
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink[400], textTransform: 'uppercase', letterSpacing: 1 }}>
          Établissement
        </Text>
        <InfoRow label="Nom" value={tenant.name} />
        <InfoRow label="Code" value={tenant.slug} />
      </View>

      {/* Logout */}
      <View style={{ marginTop: 8 }}>
        <Button label="Se déconnecter" variant="secondary" onPress={handleLogout} />
      </View>
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
