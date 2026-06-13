import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import {
  Button,
  ConfirmDialog,
  EmptyState,
  Fab,
  FormField,
  FormSheet,
  Picker,
  colors,
  radius,
  type PickerOption,
} from '@klasso/ui-mobile';
import {
  ANNOUNCEMENTS_KEY,
  createAnnouncement,
  deleteAnnouncement,
  useAnnouncements,
  type Announcement,
  type AnnouncementAudience,
} from '@/lib/api/announcements';

const AUDIENCE_OPTIONS: PickerOption[] = [
  { value: 'ALL', label: 'Tout le monde' },
  { value: 'PARENTS', label: 'Parents' },
  { value: 'TEACHERS', label: 'Enseignants' },
  { value: 'STAFF', label: 'Personnel' },
];

const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  ALL: 'Tous',
  PARENTS: 'Parents',
  TEACHERS: 'Enseignants',
  STAFF: 'Personnel',
};

export default function ManageAnnouncementsScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useAnnouncements();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string>('ALL');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  const createM = useMutation({
    mutationFn: () =>
      createAnnouncement({ title: title.trim(), body: body.trim(), audience: audience as AnnouncementAudience }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY });
      setOpen(false);
      setTitle('');
      setBody('');
      setAudience('ALL');
      setErrors({});
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY });
      setToDelete(null);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Titre requis';
    if (!body.trim()) e.body = 'Message requis';
    setErrors(e);
    if (Object.keys(e).length) return;
    createM.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
        ) : items.length === 0 ? (
          <EmptyState icon="megaphone-outline" title="Aucune annonce" description="Publiez-en une avec le bouton +." />
        ) : (
          items.map((a) => (
            <View
              key={a.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>
                  {a.title}
                </Text>
                <Pressable
                  onPress={() => setToDelete(a)}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${a.title}`}
                  hitSlop={8}
                >
                  <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>
                    Suppr.
                  </Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 4 }}>{a.body}</Text>
              {a.kind === 'CIRCULAIRE' && a.attachmentUrl ? (
                <Pressable
                  onPress={() => void Linking.openURL(a.attachmentUrl as string)}
                  accessibilityRole="button"
                  accessibilityLabel={`Télécharger le PDF de ${a.title}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    alignSelf: 'flex-start',
                    marginTop: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: radius.md,
                    backgroundColor: colors.ambre[500] + '18',
                  }}
                >
                  <Ionicons name="document-attach-outline" size={15} color={colors.ambre[600]} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ambre[600] }}>
                    Télécharger le PDF
                  </Text>
                </Pressable>
              ) : null}
              <Text style={{ fontSize: 11, color: colors.ink[300], marginTop: 6 }}>
                {AUDIENCE_LABEL[a.audience]} · {a.authorName}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Nouvelle annonce" extended onPress={() => setOpen(true)} />

      <FormSheet
        visible={open}
        title="Nouvelle annonce"
        onClose={() => setOpen(false)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Publier" onPress={submit} loading={createM.isPending} />
            </View>
          </View>
        }
      >
        <FormField label="Titre" required value={title} onChangeText={setTitle} error={errors.title} />
        <FormField label="Message" required value={body} onChangeText={setBody} error={errors.body} multiline />
        <Picker label="Destinataires" value={audience} onChange={setAudience} options={AUDIENCE_OPTIONS} />
        {createM.error ? (
          <Text style={{ fontSize: 13, color: colors.status.danger500 }}>
            Erreur : {(createM.error as Error).message}
          </Text>
        ) : null}
      </FormSheet>

      <ConfirmDialog
        visible={!!toDelete}
        title="Supprimer cette annonce ?"
        message={toDelete?.title ?? ''}
        confirmLabel="Supprimer"
        destructive
        loading={deleteM.isPending}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}
