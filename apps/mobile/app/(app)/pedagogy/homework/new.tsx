import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, FormField, Picker, colors, radius, type PickerOption } from '@klasso/ui-mobile';
import {
  createHomework,
  pickAndUploadAttachment,
  type CreateHomeworkInput,
} from '@/lib/api/homework';
import { useMyClasses } from '@/lib/api/classes';
import { useSubjects } from '@/lib/api/subjects';
import { useAuthStore } from '@/lib/auth/store';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function NewHomeworkScreen() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const { data: classes } = useMyClasses(role === 'TEACHER');
  const { data: subjectsData } = useSubjects();

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState(inDays(7));
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const classOptions = useMemo<PickerOption[]>(
    () => (classes ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.level })),
    [classes],
  );
  const subjectOptions = useMemo<PickerOption[]>(
    () =>
      (subjectsData?.items ?? []).map((s) => ({ value: s.id, label: `${s.emoji ? `${s.emoji} ` : ''}${s.name}` })),
    [subjectsData],
  );

  const mutation = useMutation({
    mutationFn: (input: CreateHomeworkInput) => createHomework(input),
    onSuccess: (hw) => {
      void qc.invalidateQueries({ queryKey: ['homework', 'list'] });
      router.replace({ pathname: '/(app)/pedagogy/homework/[id]', params: { id: hw.id } });
    },
  });

  async function attachFile() {
    setUploadErr(undefined);
    setUploading(true);
    try {
      const url = await pickAndUploadAttachment();
      if (url) setAttachmentUrl(url);
    } catch (e) {
      setUploadErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    const e: Record<string, string> = {};
    if (!classId) e.classId = 'Classe requise';
    if (!title.trim()) e.title = 'Titre requis';
    if (!instructions.trim()) e.instructions = 'Consigne requise';
    if (!DATE_RE.test(dueDate)) e.dueDate = 'Format AAAA-MM-JJ';
    setErrors(e);
    if (Object.keys(e).length) return;
    mutation.mutate({
      classId,
      subjectId: subjectId || undefined,
      title: title.trim(),
      instructions: instructions.trim(),
      dueDate,
      attachmentUrl: attachmentUrl || undefined,
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Picker
        label="Classe"
        required
        value={classId}
        onChange={setClassId}
        options={classOptions}
        error={errors.classId}
        placeholder={classOptions.length ? 'Choisir une classe…' : 'Aucune classe'}
        disabled={classOptions.length === 0}
      />
      <Picker
        label="Matière"
        value={subjectId}
        onChange={setSubjectId}
        options={subjectOptions}
        placeholder="(optionnel)"
      />
      <FormField label="Titre" required value={title} onChangeText={setTitle} error={errors.title} placeholder="Exercices p.42" />
      <FormField
        label="Consigne"
        required
        value={instructions}
        onChangeText={setInstructions}
        error={errors.instructions}
        multiline
        placeholder="Ce que l'élève doit faire…"
      />
      <FormField
        label="Échéance"
        required
        value={dueDate}
        onChangeText={setDueDate}
        error={errors.dueDate}
        placeholder="AAAA-MM-JJ"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      {/* Pièce jointe (web) */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: 6 }}>
        Pièce jointe
      </Text>
      {attachmentUrl ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={{ flex: 1, fontSize: 13, color: colors.status.success500 }} numberOfLines={1}>
            📎 Fichier joint
          </Text>
          <Pressable onPress={() => setAttachmentUrl('')} accessibilityRole="button" accessibilityLabel="Retirer la pièce jointe">
            <Text style={{ color: colors.status.danger500, fontWeight: '600', fontSize: 13 }}>Retirer</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={attachFile}
          disabled={uploading || Platform.OS !== 'web'}
          accessibilityRole="button"
          accessibilityLabel="Joindre un fichier"
          style={{
            paddingVertical: 11,
            borderRadius: radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.ink[300],
            alignItems: 'center',
            marginBottom: 6,
            opacity: Platform.OS !== 'web' ? 0.5 : 1,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.ink[500], fontWeight: '600' }}>
            {uploading ? 'Envoi…' : Platform.OS === 'web' ? '+ Joindre un fichier (PDF, image)' : 'Disponible sur le web'}
          </Text>
        </Pressable>
      )}
      {uploadErr ? (
        <Text style={{ fontSize: 12, color: colors.status.danger500, marginBottom: 8 }}>{uploadErr}</Text>
      ) : null}

      {mutation.error ? (
        <Text style={{ fontSize: 13, color: colors.status.danger500, marginTop: 10, marginBottom: 6 }}>
          Erreur : {(mutation.error as Error).message}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Button label="Annuler" variant="secondary" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Créer" onPress={submit} loading={mutation.isPending} />
        </View>
      </View>
    </ScrollView>
  );
}
