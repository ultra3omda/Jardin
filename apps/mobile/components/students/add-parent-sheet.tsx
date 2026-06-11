import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, FormField, FormSheet, colors, fonts, radius } from '@klasso/ui-mobile';
import { useCreateParent, type CreatedParent } from '@/lib/api/parents';

interface AddParentSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the new parent's email so the caller can auto-select it. */
  onCreated: (email: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Inline parent-account creation from the student form (admin). Mirrors the
 * web "Ajouter un parent" flow: firstName/lastName/email → POST /api/parents.
 * The API mints a one-time temp password — it is displayed here ONCE so the
 * admin can hand it to the parent (it cannot be retrieved later).
 */
export function AddParentSheet({ visible, onClose, onCreated }: AddParentSheetProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string }>(
    {},
  );
  const [created, setCreated] = useState<CreatedParent | null>(null);
  const mutation = useCreateParent();

  function reset() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setErrors({});
    setCreated(null);
    mutation.reset();
  }

  function handleClose() {
    // If a parent was created, still propagate the selection on dismiss.
    if (created) onCreated(created.email);
    reset();
    onClose();
  }

  function handleSubmit() {
    const e: typeof errors = {};
    if (!firstName.trim()) e.firstName = 'Prénom requis';
    if (!lastName.trim()) e.lastName = 'Nom requis';
    if (!EMAIL_RE.test(email.trim())) e.email = 'Email invalide';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    mutation.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() },
      { onSuccess: (parent) => setCreated(parent) },
    );
  }

  function handleDone() {
    if (created) onCreated(created.email);
    reset();
    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={created ? 'Parent créé' : 'Nouveau parent'}
      onClose={handleClose}
      footer={
        created ? (
          <Button label="Terminé" onPress={handleDone} />
        ) : (
          <View style={{ gap: 8 }}>
            <Button label="Créer le parent" onPress={handleSubmit} loading={mutation.isPending} />
            <Button label="Annuler" variant="ghost" onPress={handleClose} />
          </View>
        )
      }
    >
      {created ? (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 14, color: colors.ink[700], fontFamily: fonts.body }}>
            Le compte de{' '}
            <Text style={{ fontFamily: fonts.bodyBold }}>
              {created.firstName} {created.lastName}
            </Text>{' '}
            est prêt et sera sélectionné comme parent de l'élève.
          </Text>
          {created.tempPassword ? (
            <View
              style={{
                backgroundColor: colors.gold[50],
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.gold[100],
                padding: 14,
                gap: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: fonts.bodyBold,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: colors.gold[700],
                }}
              >
                Mot de passe provisoire — affiché une seule fois
              </Text>
              <Text style={{ fontSize: 20, fontFamily: fonts.bodyBold, color: colors.ink[900] }}>
                {created.tempPassword}
              </Text>
              <Text style={{ fontSize: 12, color: colors.ink[500], fontFamily: fonts.body }}>
                Transmettez-le au parent ({created.email}). Il pourra le changer après connexion.
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View>
          <FormField
            label="Prénom"
            required
            value={firstName}
            onChangeText={(v) => {
              setFirstName(v);
              if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined }));
            }}
            error={errors.firstName}
            placeholder="Salma"
          />
          <FormField
            label="Nom"
            required
            value={lastName}
            onChangeText={(v) => {
              setLastName(v);
              if (errors.lastName) setErrors((p) => ({ ...p, lastName: undefined }));
            }}
            error={errors.lastName}
            placeholder="Ben Ali"
          />
          <FormField
            label="Email"
            required
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
            error={errors.email}
            placeholder="parent@exemple.tn"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {mutation.error ? (
            <Text style={{ fontSize: 12, color: colors.status.danger500, fontFamily: fonts.body }}>
              {(mutation.error as Error).message}
            </Text>
          ) : null}
        </View>
      )}
    </FormSheet>
  );
}
