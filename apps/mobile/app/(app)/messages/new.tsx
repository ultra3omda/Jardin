import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, Picker, colors, type PickerOption } from '@klasso/ui-mobile';
import { openConversation, useContacts } from '@/lib/api/messaging';

const ROLE_LABEL: Record<string, string> = {
  SCHOOL_ADMIN: 'Direction',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  STAFF: 'Personnel',
};

/**
 * Lot complémentaire — Démarrer une nouvelle conversation 1:1.
 * Le destinataire est choisi dans la liste de contacts (filtrée par rôle côté
 * serveur : un parent ne voit que les enseignants & la direction).
 */
export default function NewConversationScreen() {
  const { data, isLoading, isError, refetch } = useContacts();
  const [recipientId, setRecipientId] = useState('');
  const [error, setError] = useState<string | undefined>();

  const options = useMemo<PickerOption[]>(
    () =>
      (data?.items ?? []).map((c) => ({
        value: c.userId,
        label: `${c.firstName} ${c.lastName}`,
        hint: ROLE_LABEL[c.role] ?? c.role,
      })),
    [data],
  );

  const mutation = useMutation({
    mutationFn: () => openConversation(recipientId),
    onSuccess: (conv) => {
      const other = conv.participants.find((p) => p.userId === recipientId);
      const name = other ? `${other.firstName} ${other.lastName}` : 'Conversation';
      router.replace({ pathname: '/(app)/messages/[id]', params: { id: conv.id, name } });
    },
  });

  function submit() {
    if (!recipientId) {
      setError('Choisissez un destinataire');
      return;
    }
    setError(undefined);
    mutation.mutate();
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      {isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : isError ? (
        <Text style={{ color: colors.status.danger500 }} onPress={() => void refetch()}>
          Impossible de charger les contacts. Toucher pour réessayer.
        </Text>
      ) : options.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Aucun contact"
          description="Aucun destinataire disponible pour le moment."
        />
      ) : (
        <>
          <Picker
            label="Destinataire"
            required
            value={recipientId}
            onChange={(v) => {
              setRecipientId(v);
              setError(undefined);
            }}
            options={options}
            error={error}
            placeholder="Rechercher une personne…"
          />
          {mutation.error ? (
            <Text style={{ fontSize: 13, color: colors.status.danger500, marginBottom: 12 }}>
              Erreur : {(mutation.error as Error).message}
            </Text>
          ) : null}
          <Button label="Démarrer la conversation" onPress={submit} loading={mutation.isPending} />
        </>
      )}
    </ScrollView>
  );
}
