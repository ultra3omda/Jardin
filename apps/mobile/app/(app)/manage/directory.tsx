import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  ConfirmDialog,
  EmptyState,
  Fab,
  FormField,
  FormSheet,
  colors,
  radius,
} from '@klasso/ui-mobile';
import {
  createDirectoryUser,
  deleteDirectoryUser,
  DIRECTORY_KEY,
  useDirectory,
  type DirectoryKind,
  type StaffMutationResult,
} from '@/lib/api/staff';

const KINDS: { value: DirectoryKind; label: string }[] = [
  { value: 'teachers', label: 'Enseignants' },
  { value: 'parents', label: 'Parents' },
  { value: 'staff', label: 'Personnel' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DirectoryScreen() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<DirectoryKind>('teachers');
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<StaffMutationResult | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = useDirectory(kind);
  const items = data?.items.filter((u) => !u.deletedAt) ?? [];

  const createM = useMutation({
    mutationFn: () => createDirectoryUser(kind, { email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim() }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: DIRECTORY_KEY(kind) });
      setCreated(res);
      setOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setErrors({});
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteDirectoryUser(kind as 'teachers' | 'staff', id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DIRECTORY_KEY(kind) });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Prénom requis';
    if (!lastName.trim()) e.lastName = 'Nom requis';
    if (!EMAIL_RE.test(email.trim())) e.email = 'Email invalide';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  const canDelete = kind !== 'parents';

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      {/* Segmented control */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.paper[100],
          borderRadius: radius.md,
          padding: 4,
          margin: 16,
          marginBottom: 8,
        }}
      >
        {KINDS.map((k) => {
          const active = k.value === kind;
          return (
            <Pressable
              key={k.value}
              onPress={() => setKind(k.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: radius.sm,
                backgroundColor: active ? colors.surface : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: '600', color: active ? colors.ink[900] : colors.ink[500] }}
              >
                {k.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 96 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
        ) : items.length === 0 ? (
          <EmptyState icon="people-outline" title="Aucun compte" description="Ajoutez-en un avec le bouton +." />
        ) : (
          items.map((u) => (
            <View
              key={u.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink[900] }}>
                  {u.firstName} {u.lastName}
                </Text>
                <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>{u.email}</Text>
              </View>
              {canDelete ? (
                <Pressable
                  onPress={() => setToDelete({ id: u.id, name: `${u.firstName} ${u.lastName}` })}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${u.firstName} ${u.lastName}`}
                  hitSlop={8}
                  style={{ paddingLeft: 12 }}
                >
                  <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>
                    Supprimer
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Ajouter un compte" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title={`Nouveau ${KINDS.find((k) => k.value === kind)?.label.toLowerCase().replace(/s$/, '')}`}
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Créer" onPress={submit} loading={createM.isPending} />
            </View>
          </View>
        }
      >
        <FormField label="Prénom" required value={firstName} onChangeText={setFirstName} error={errors.firstName} />
        <FormField label="Nom" required value={lastName} onChangeText={setLastName} error={errors.lastName} />
        <FormField
          label="Email"
          required
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="prenom@exemple.tn"
        />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      {/* Temp password reveal */}
      <FormSheet
        visible={!!created}
        title="Compte créé"
        onClose={() => setCreated(null)}
        footer={<Button label="J'ai noté le mot de passe" onPress={() => setCreated(null)} />}
      >
        <Text style={{ fontSize: 14, color: colors.ink[700], marginBottom: 12 }}>
          {created?.firstName} {created?.lastName} ({created?.email}) peut maintenant se connecter.
        </Text>
        {created?.tempPassword ? (
          <View
            style={{
              backgroundColor: colors.ambre[50],
              borderWidth: 1,
              borderColor: colors.ambre[100],
              borderRadius: radius.md,
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.ink[500], marginBottom: 4 }}>
              Mot de passe temporaire
            </Text>
            <Text selectable style={{ fontSize: 18, fontWeight: '700', color: colors.ambre[700] }}>
              {created.tempPassword}
            </Text>
            <Text style={{ fontSize: 11, color: colors.ink[500], marginTop: 8 }}>
              Transmettez-le en sécurité ; il ne sera plus affiché.
            </Text>
          </View>
        ) : null}
      </FormSheet>

      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer ce compte ?"
        message={`${toDelete?.name ?? ''} n'aura plus accès à la plateforme.`}
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}
