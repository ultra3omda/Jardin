import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ConfirmDialog } from '@klasso/ui-mobile';
import { deleteStudent, getStudent } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/store';

/**
 * V2 — Mobile : détail élève read-only.
 * 4 sections (Identité / Scolarité / Famille & Contact / Santé RGPD).
 */
function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <View className="mb-2">
      <Text className="text-xs uppercase tracking-wide text-gray-500">{label}</Text>
      <Text className="text-base text-gray-900">
        {value === null || value === undefined || value === '' ? '—' : String(value)}
      </Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <Text className="mb-3 text-lg font-semibold">{title}</Text>
      {children}
    </View>
  );
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = useAuthStore((st) => st.user?.role) === 'SCHOOL_ADMIN';
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const {
    data: s,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteStudent(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['students'] });
      setConfirmOpen(false);
      router.replace('/(app)/students');
    },
  });

  if (isLoading) {
    return (
      <Text className="p-4 text-gray-500" accessibilityRole="alert">
        Chargement…
      </Text>
    );
  }
  if (error) {
    return (
      <Text className="p-4 text-rose-600" accessibilityRole="alert">
        Erreur : {(error as Error).message}
      </Text>
    );
  }
  if (!s) {
    return <Text className="p-4 text-gray-500">Introuvable.</Text>;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="mb-4">
        <Text className="text-2xl font-bold">
          {s.firstName} {s.lastName}
        </Text>
        <Text className="text-sm text-gray-500">Classe {s.classroom}</Text>
      </View>

      {isAdmin ? (
        <View className="mb-4 flex-row gap-3">
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(app)/students/edit/[id]', params: { id: s.id } })
            }
            className="flex-1 items-center rounded-xl border border-gray-300 bg-white py-3"
            accessibilityRole="button"
            accessibilityLabel="Modifier l'élève"
          >
            <Text className="text-base font-semibold text-gray-900">Modifier</Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirmOpen(true)}
            className="flex-1 items-center rounded-xl border border-rose-200 bg-rose-50 py-3"
            accessibilityRole="button"
            accessibilityLabel="Supprimer l'élève"
          >
            <Text className="text-base font-semibold text-rose-600">Supprimer</Text>
          </Pressable>
        </View>
      ) : null}

      <Section title="Identité">
        <Field label="Date de naissance" value={s.dateOfBirth} />
        <Field label="Sexe" value={s.sex === 'M' ? 'Masculin' : 'Féminin'} />
        <Field label="Nationalité" value={s.nationality} />
        <Field label="Langue maternelle" value={s.motherTongue} />
      </Section>

      <Section title="Scolarité">
        <Field label="Classe" value={s.classroom} />
        <Field label="Inscription" value={s.enrollmentDate} />
        <Field label="Antécédents" value={s.previousSchooling} />
      </Section>

      <Section title="Famille & Contact">
        <Field label="Parent" value={s.parentEmail} />
        <Field label="Frères/sœurs" value={s.siblingsCount} />
        <Field label="Adresse" value={s.addressLine} />
        <Field label="Ville" value={s.city} />
        <Field label="Pays" value={s.country} />
      </Section>

      {s.medicalNotes ? (
        <View className="mb-4 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <Text className="mb-2 text-lg font-semibold text-amber-900">
            ⚠️ Notes médicales (RGPD)
          </Text>
          <Text className="text-sm text-amber-900">{s.medicalNotes}</Text>
        </View>
      ) : null}

      <Link
        href={{ pathname: '/(app)/bulletin/[id]', params: { id: s.id } }}
        asChild
      >
        <Pressable
          className="mb-6 items-center rounded-xl bg-gray-900 py-4"
          accessibilityRole="button"
          accessibilityLabel="Voir le bulletin scolaire"
        >
          <Text className="text-base font-bold text-white">Voir le bulletin</Text>
        </Pressable>
      </Link>

      <ConfirmDialog
        visible={confirmOpen}
        title="Supprimer cet élève ?"
        message={`${s.firstName} ${s.lastName} sera retiré des listes. Cette action est réversible côté administration.`}
        confirmLabel="Supprimer"
        destructive
        loading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </ScrollView>
  );
}
