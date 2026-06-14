import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Button, FormField, Picker, colors, fonts, radius } from '@klasso/ui-mobile';
import {
  useCreateOrganization,
  type CreateOrganizationResponse,
  type TenantType,
} from '@/lib/api/commercial';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TYPE_OPTIONS = [
  { value: 'PRIMARY_SCHOOL', label: 'École primaire' },
  { value: 'KINDERGARTEN', label: "Jardin d'enfants" },
  { value: 'MIXED', label: 'Mixte (primaire + jardin)' },
];

// Accent fold for common Latin characters — avoids String.prototype.normalize
// which is not guaranteed on Hermes (no other mobile code relies on it).
const ACCENT_MAP: Record<string, string> = {
  à: 'a', â: 'a', ä: 'a', á: 'a', ã: 'a', å: 'a',
  ç: 'c',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  î: 'i', ï: 'i', í: 'i', ì: 'i',
  ô: 'o', ö: 'o', ó: 'o', ò: 'o', õ: 'o',
  ù: 'u', û: 'u', ü: 'u', ú: 'u',
  ÿ: 'y', ý: 'y',
  ñ: 'n',
  æ: 'ae', œ: 'oe',
};

/** name → slug : minuscules, alphanumérique + tirets, sans accents superflus. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[àâäáãåçéèêëîïíìôöóòõùûüúÿýñæœ]/g, (ch) => ACCENT_MAP[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export default function NewOrganizationScreen() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [type, setType] = useState<TenantType>('PRIMARY_SCHOOL');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const m = useCreateOrganization();
  const [result, setResult] = useState<CreateOrganizationResponse | null>(null);

  function onNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Nom requis (2 caractères min.).';
    if (!SLUG_RE.test(slug)) e.slug = 'Slug : minuscules, chiffres et tirets (3 à 63 car.).';
    if (!EMAIL_RE.test(adminEmail.trim())) e.adminEmail = 'Email invalide.';
    if (!adminFirstName.trim()) e.adminFirstName = 'Prénom requis.';
    if (!adminLastName.trim()) e.adminLastName = 'Nom requis.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit() {
    if (!validate()) return;
    m.mutate(
      {
        name: name.trim(),
        slug,
        type,
        adminEmail: adminEmail.trim(),
        adminFirstName: adminFirstName.trim(),
        adminLastName: adminLastName.trim(),
        sendInviteEmail,
      },
      { onSuccess: (res) => setResult(res) },
    );
  }

  if (result) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.paper[50] }}
        contentContainerStyle={{ padding: 24, gap: 12 }}
      >
        <Text style={{ fontSize: 20, fontFamily: fonts.displayBold, color: colors.ink[900] }}>
          Organisation créée ✅
        </Text>
        <Text style={{ fontSize: 14, color: colors.ink[700], fontFamily: fonts.body }}>
          {result.organization.name} a été enregistrée. {result.inviteEmailSent
            ? "Un email d'invitation a été envoyé à l'administrateur."
            : "Transmettez le lien d'invitation ci-dessous à l'administrateur."}
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radius.md,
            padding: 12,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.ink[500], fontFamily: fonts.bodySemibold, textTransform: 'uppercase' }}>
            Lien d&apos;invitation
          </Text>
          <Text selectable style={{ fontSize: 13, color: colors.ink[900], fontFamily: fonts.body }}>
            {result.invite.url}
          </Text>
        </View>

        <View style={{ marginTop: 8 }}>
          <Button label="Terminé" onPress={() => router.back()} />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 16, fontFamily: fonts.body }}>
          Enregistrez l&apos;établissement que vous avez signé. Son administrateur recevra une
          invitation pour créer son compte et configurer son espace.
        </Text>

        <FormField
          label="Nom de l'établissement"
          required
          value={name}
          onChangeText={onNameChange}
          error={errors.name}
          placeholder="École Saint-Pierre"
        />
        <FormField
          label="Slug (URL)"
          required
          value={slug}
          onChangeText={(v) => {
            setSlugEdited(true);
            setSlug(v);
          }}
          error={errors.slug}
          placeholder="saint-pierre"
          autoCapitalize="none"
          autoCorrect={false}
          hint="Identifiant URL : minuscules, chiffres et tirets."
        />
        <Picker
          label="Type"
          required
          value={type}
          onChange={(v) => setType(v as TenantType)}
          options={TYPE_OPTIONS}
        />

        <Text style={{ fontSize: 13, fontFamily: fonts.bodySemibold, color: colors.ink[700], marginTop: 8, marginBottom: 10 }}>
          Administrateur de l&apos;établissement
        </Text>
        <FormField
          label="Email"
          required
          value={adminEmail}
          onChangeText={setAdminEmail}
          error={errors.adminEmail}
          placeholder="directeur@ecole-saint-pierre.tn"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <FormField
          label="Prénom"
          required
          value={adminFirstName}
          onChangeText={setAdminFirstName}
          error={errors.adminFirstName}
          placeholder="Jean"
        />
        <FormField
          label="Nom"
          required
          value={adminLastName}
          onChangeText={setAdminLastName}
          error={errors.adminLastName}
          placeholder="Dupont"
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
            marginBottom: 6,
          }}
        >
          <Text style={{ flex: 1, fontSize: 13, color: colors.ink[700], fontFamily: fonts.body }}>
            Envoyer l&apos;invitation par email
          </Text>
          <Switch
            value={sendInviteEmail}
            onValueChange={setSendInviteEmail}
            trackColor={{ true: colors.ambre[500] }}
            accessibilityLabel="Envoyer l'invitation par email"
          />
        </View>

        <Text style={{ fontSize: 12, color: colors.ink[300], marginBottom: 12, fontFamily: fonts.body }}>
          Le contrat signé (PDF) se rattache depuis l&apos;espace web.
        </Text>

        {m.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500, marginBottom: 8 }}>
            Erreur : {(m.error as Error).message}
          </Text>
        ) : null}

        <Button label="Créer l'organisation" onPress={submit} loading={m.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
