import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { getStudent } from '@/lib/api/students';

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
  const {
    data: s,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
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
    </ScrollView>
  );
}
